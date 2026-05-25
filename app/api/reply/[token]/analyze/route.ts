import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeUnderstanding } from '@/lib/services/llm';
import { sendMessageToUsers } from '@/lib/services/wecom-contact';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const assignment = await prisma.trainingAssignment.findUnique({
      where: { uniqueToken: token },
      include: {
        session: {
          include: { keyPoints: true },
        },
        employee: true,
        reply: true,
      },
    });

    if (!assignment || !assignment.reply || !assignment.reply.transcript) {
      return NextResponse.json({ error: '未找到回复或转写内容' }, { status: 400 });
    }

    const keyPoints = assignment.session.keyPoints.map((kp) => kp.title);
    const result = await analyzeUnderstanding(
      assignment.session.sourceTranscript || '',
      keyPoints,
      assignment.reply.transcript
    );

    await prisma.understandingAnalysis.upsert({
      where: { replyId: assignment.reply.id },
      create: {
        replyId: assignment.reply.id,
        coverageScore: result.coverage_score,
        accuracyScore: result.accuracy_score,
        overallScore: result.overall_score,
        level: result.level,
        coveredPoints: result.covered_points.join(','),
        missingPoints: result.missing_points.join(','),
        wrongPoints: result.wrong_points.join(','),
        riskLevel: result.risk_level,
        summary: result.summary,
        correctionSuggestion: result.correction_suggestion,
        rawAiResult: JSON.stringify(result),
      },
      update: {
        coverageScore: result.coverage_score,
        accuracyScore: result.accuracy_score,
        overallScore: result.overall_score,
        level: result.level,
        coveredPoints: result.covered_points.join(','),
        missingPoints: result.missing_points.join(','),
        wrongPoints: result.wrong_points.join(','),
        riskLevel: result.risk_level,
        summary: result.summary,
        correctionSuggestion: result.correction_suggestion,
        rawAiResult: JSON.stringify(result),
      },
    });

    await prisma.trainingAssignment.update({
      where: { id: assignment.id },
      data: { status: 'analyzed' },
    });

    // 发送分析结果通知给员工
    if (assignment.employee.wecomUserId) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const resultUrl = `${baseUrl}/reply/${token}`;
        const levelEmoji = result.level === '理解到位' ? '✅' : result.level === '基本理解' ? '⚠️' : '❌';

        const content = `**培训效果分析结果通知**\n\n**${assignment.employee.name}** 您好，\n\n您参与的培训「**${assignment.session.title}**」已完成效果分析。\n\n${levelEmoji} **理解程度**：${result.level}\n\n📊 **综合得分**：${result.overall_score} 分\n\n📝 **评价摘要**：\n${result.summary}\n\n👉 [点击查看详细分析结果](${resultUrl})`;

        await sendMessageToUsers([assignment.employee.wecomUserId], content);
      } catch (err) {
        console.error('发送分析结果通知失败:', err);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('分析失败:', error);
    return NextResponse.json({ error: '分析失败' }, { status: 500 });
  }
}

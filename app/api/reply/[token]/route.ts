import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/services/storage';
import { downloadVoice } from '@/lib/services/wecom-jssdk';
import { transcribeAudio } from '@/lib/services/asr';
import { analyzeUnderstanding } from '@/lib/services/llm';
import { sendMessageToUsers } from '@/lib/services/wecom-contact';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

function getMimeTypeFromPath(filePath: string): string {
  if (filePath.endsWith('.amr')) return 'audio/amr';
  if (filePath.endsWith('.wav')) return 'audio/wav';
  if (filePath.endsWith('.mp3')) return 'audio/mpeg';
  if (filePath.endsWith('.webm')) return 'audio/webm';
  return 'audio/webm';
}

async function processReplyPipeline(assignmentId: string, replyId: string) {
  try {
    const assignment = await prisma.trainingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: { include: { keyPoints: true } },
        employee: true,
        reply: true,
      },
    });

    if (!assignment?.reply) return;

    let transcript = assignment.reply.transcript || '';

    // 有音频且无转写时，先转写
    if (!transcript && assignment.reply.audioPath) {
      try {
        const audioBuffer = await readFile(assignment.reply.audioPath);
        const mimeType = getMimeTypeFromPath(assignment.reply.audioPath);
        transcript = await transcribeAudio(audioBuffer, mimeType);
      } catch (err) {
        console.error('转写失败:', err);
      }

      if (!transcript) {
        transcript = '（ASR 转写失败）';
      }

      await prisma.employeeReply.update({
        where: { id: replyId },
        data: { transcript },
      });

      await prisma.trainingAssignment.update({
        where: { id: assignmentId },
        data: { status: 'transcribed' },
      });
    }

    // 有转写内容时，进行分析
    if (transcript) {
      const keyPoints = assignment.session.keyPoints.map((kp) => kp.title);
      const result = await analyzeUnderstanding(
        assignment.session.sourceTranscript || '',
        keyPoints,
        transcript,
      );

      await prisma.understandingAnalysis.upsert({
        where: { replyId },
        create: {
          replyId,
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
        where: { id: assignmentId },
        data: { status: 'analyzed' },
      });

      // 发分析结果通知给员工
      if (assignment.employee.wecomUserId) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const resultUrl = `${baseUrl}/reply/${assignment.uniqueToken}`;
          const levelEmoji = result.level === '理解到位' ? '✅' : result.level === '基本理解' ? '⚠️' : '❌';

          const content = `**培训效果分析结果通知**\n\n**${assignment.employee.name}** 您好，\n\n您参与的培训「**${assignment.session.title}**」已完成效果分析。\n\n${levelEmoji} **理解程度**：${result.level}\n\n\u{1F4CA} **综合得分**：${result.overall_score} 分\n\n\u{1F4DD} **评价摘要**：\n${result.summary}\n\n\u{1F449} [点击查看详细分析结果](${resultUrl})`;

          await sendMessageToUsers([assignment.employee.wecomUserId], content);
        } catch (err) {
          console.error('发送分析结果通知失败:', err);
        }
      }
    }
  } catch (err) {
    console.error('回复处理流水线失败:', err);
  }
}

export async function GET(
  _request: NextRequest,
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
        reply: {
          include: { analysis: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: '链接无效' }, { status: 404 });
    }

    if (assignment.openedAt === null) {
      await prisma.trainingAssignment.update({
        where: { id: assignment.id },
        data: { openedAt: new Date(), status: 'opened' },
      });
    }

    return NextResponse.json({
      session: {
        title: assignment.session.title,
        keyPoints: assignment.session.keyPoints.map((kp) => ({
          title: kp.title,
          description: kp.description,
        })),
      },
      employee: {
        name: assignment.employee.name,
      },
      reply: assignment.reply
        ? {
            transcript: assignment.reply.transcript,
            submittedAt: assignment.reply.submittedAt,
            audioPath: assignment.reply.audioPath,
            analysis: assignment.reply.analysis,
          }
        : null,
    });
  } catch (error) {
    console.error('获取回复页数据失败:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const formData = await request.formData();
    const serverId = formData.get('serverId') as string | null;
    const manualTranscript = formData.get('transcript') as string | null;

    const assignment = await prisma.trainingAssignment.findUnique({
      where: { uniqueToken: token },
    });

    if (!assignment) {
      return NextResponse.json({ error: '链接无效' }, { status: 404 });
    }

    let audioPath: string | null = null;
    let transcript = manualTranscript || '';

    // 企微 JS-SDK 上传的语音，通过 serverId 下载
    if (serverId) {
      try {
        const saveDir = resolve(process.cwd(), 'uploads', 'voices');
        if (!existsSync(saveDir)) {
          mkdirSync(saveDir, { recursive: true });
        }
        audioPath = await downloadVoice(serverId, saveDir);
      } catch (err) {
        console.error('下载企微语音失败:', err);
      }
    }

    // 兼容旧方式：直接上传音频文件（浏览器录音）
    const audioFile = formData.get('audio') as File | null;
    if (audioFile && !audioPath) {
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `audio_${token}_${Date.now()}.webm`;
      const result = await saveFile(buffer, fileName);
      audioPath = result.objectKey;
    }

    const reply = await prisma.employeeReply.create({
      data: {
        assignmentId: assignment.id,
        audioPath,
        transcript,
      },
    });

    await prisma.trainingAssignment.update({
      where: { id: assignment.id },
      data: { repliedAt: new Date(), status: 'replied' },
    });

    // 后台自动执行：转写 → 分析 → 发消息
    processReplyPipeline(assignment.id, reply.id).catch((err) =>
      console.error('后台处理管道失败:', err)
    );

    return NextResponse.json(reply);
  } catch (error) {
    console.error('提交回复失败:', error);
    return NextResponse.json({ error: '提交回复失败' }, { status: 500 });
  }
}

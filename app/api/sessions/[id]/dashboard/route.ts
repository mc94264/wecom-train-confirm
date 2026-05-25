import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChatId, initMcpClient, getMcpClient } from '@/lib/services/wecom-mcp';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check MCP status
    let mcpStatus: {
      configured: boolean;
      connected: boolean;
      authenticated: boolean;
      chatId: string | null;
      message: string;
    } | null = null;

    const mcpBotId = process.env.WECOM_MCP_BOT_ID;
    const mcpSecret = process.env.WECOM_MCP_BOT_SECRET;
    if (mcpBotId && mcpSecret) {
      let client = getMcpClient();
      if (!client?.connected) {
        await initMcpClient();
      }
      const updatedClient = getMcpClient();
      const chatId = await getChatId();
      mcpStatus = {
        configured: true,
        connected: updatedClient?.connected || false,
        authenticated: updatedClient?.authenticated || false,
        chatId,
        message: chatId
          ? '已获取 chatid，可以正常发送消息'
          : 'MCP 已连接，但尚未获取 chatid。请将机器人拉到群里并 @机器人或发送消息',
      };
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        keyPoints: {
          orderBy: { weight: 'desc' },
        },
        assignments: {
          include: {
            employee: true,
            reply: {
              include: {
                analysis: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    const total = session.assignments.length;
    const replied = session.assignments.filter((a) => a.status === 'replied' || a.status === 'transcribed' || a.status === 'analyzed').length;
    const transcribed = session.assignments.filter((a) => a.status === 'transcribed' || a.status === 'analyzed').length;
    const analyzed = session.assignments.filter((a) => a.status === 'analyzed').length;
    const understood = session.assignments.filter((a) => a.reply?.analysis?.level === '理解到位').length;
    const basicUnderstood = session.assignments.filter((a) => a.reply?.analysis?.level === '基本理解').length;
    const insufficient = session.assignments.filter((a) => a.reply?.analysis?.level === '理解不足').length;
    const deviation = session.assignments.filter((a) => a.reply?.analysis?.level === '存在偏差').length;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const employeeDetails = session.assignments.map((a) => ({
      id: a.id,
      employeeName: a.employee.name,
      employeeTeam: a.employee.team,
      status: a.status,
      pushedAt: a.pushedAt,
      repliedAt: a.repliedAt,
      uniqueToken: a.uniqueToken,
      replyUrl: `${baseUrl}/reply/${a.uniqueToken}`,
      transcript: a.reply?.transcript || null,
      audioPath: a.reply?.audioPath || null,
      audioUrl: a.reply?.audioPath ? `${baseUrl}/api/audio?path=${encodeURIComponent(a.reply.audioPath)}` : null,
      analysis: a.reply?.analysis
        ? {
            level: a.reply.analysis.level,
            overallScore: a.reply.analysis.overallScore,
            coveredPoints: a.reply.analysis.coveredPoints?.split(',') || [],
            missingPoints: a.reply.analysis.missingPoints?.split(',') || [],
            wrongPoints: a.reply.analysis.wrongPoints?.split(',') || [],
            summary: a.reply.analysis.summary,
            correctionSuggestion: a.reply.analysis.correctionSuggestion,
          }
        : null,
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        demoMode: session.demoMode,
        createdAt: session.createdAt,
        sourceTranscript: session.sourceTranscript,
        summary: session.summary,
        keyPoints: session.keyPoints.map((kp) => ({
          id: kp.id,
          title: kp.title,
          description: kp.description,
          keywords: kp.keywords,
        })),
      },
      stats: {
        total,
        replied,
        notReplied: total - replied,
        replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
        transcribed,
        analyzed,
        understood: understood + basicUnderstood,
        needCorrection: insufficient + deviation,
        understandingRate: analyzed > 0 ? Math.round(((understood + basicUnderstood) / analyzed) * 100) : 0,
      },
      employeeDetails,
      mcpStatus,
    });
  } catch (error) {
    console.error('获取看板数据失败:', error);
    return NextResponse.json({ error: '获取看板数据失败' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/services/storage';
import { downloadVoice } from '@/lib/services/wecom-jssdk';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

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

    return NextResponse.json(reply);
  } catch (error) {
    console.error('提交回复失败:', error);
    return NextResponse.json({ error: '提交回复失败' }, { status: 500 });
  }
}

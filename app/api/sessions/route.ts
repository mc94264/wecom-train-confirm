import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/services/storage';
import { transcribeAudio } from '@/lib/services/asr';
import * as path from 'path';

export async function GET() {
  const sessions = await prisma.trainingSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let title: string;
    let sourceTranscript: string;
    let sourceAudioPath: string | null = null;
    let wecomWebhookUrl: string | null = null;
    let deadline: Date | null = null;
    let demoMode = false;

    if (isMultipart) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      const audioFile = formData.get('audio') as File | null;
      wecomWebhookUrl = (formData.get('wecomWebhookUrl') as string) || null;
      const deadlineStr = (formData.get('deadline') as string) || null;
      deadline = deadlineStr ? new Date(deadlineStr) : null;
      demoMode = formData.get('demoMode') === 'true';

      if (!title || !audioFile) {
        return NextResponse.json(
          { error: '标题和音频文件不能为空' },
          { status: 400 }
        );
      }

      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(audioFile.name) || '.webm';
      const filename = `session_audio_${Date.now()}${ext}`;
      const result = await saveFile(buffer, filename);
      sourceAudioPath = result.objectKey;

      sourceTranscript = await transcribeAudio(buffer, audioFile.type || 'audio/webm');
    } else {
      const body = await request.json();
      title = body.title;
      sourceTranscript = body.sourceTranscript;
      wecomWebhookUrl = body.wecomWebhookUrl || null;
      deadline = body.deadline ? new Date(body.deadline) : null;
      demoMode = body.demoMode === true;

      if (!title || !sourceTranscript) {
        return NextResponse.json(
          { error: '标题和宣讲内容不能为空' },
          { status: 400 }
        );
      }
    }

    const session = await prisma.trainingSession.create({
      data: {
        title,
        sourceTranscript,
        sourceAudioPath,
        wecomWebhookUrl,
        deadline,
        demoMode,
        status: 'content_ready',
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('创建培训任务失败:', error);
    return NextResponse.json(
      { error: '创建培训任务失败' },
      { status: 500 }
    );
  }
}

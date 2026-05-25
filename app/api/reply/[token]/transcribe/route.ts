import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/services/asr';
import { readFile } from 'fs/promises';

function getMimeTypeFromPath(filePath: string): string {
  if (filePath.endsWith('.amr')) return 'audio/amr';
  if (filePath.endsWith('.wav')) return 'audio/wav';
  if (filePath.endsWith('.mp3')) return 'audio/mpeg';
  if (filePath.endsWith('.webm')) return 'audio/webm';
  return 'audio/webm';
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const assignment = await prisma.trainingAssignment.findUnique({
      where: { uniqueToken: token },
      include: {
        reply: true,
      },
    });

    if (!assignment || !assignment.reply) {
      return NextResponse.json({ error: '未找到回复记录' }, { status: 404 });
    }

    let transcript = '';
    if (assignment.reply.audioPath) {
      try {
        const audioBuffer = await readFile(assignment.reply.audioPath);
        const mimeType = getMimeTypeFromPath(assignment.reply.audioPath);
        transcript = await transcribeAudio(audioBuffer, mimeType);
      } catch {
        transcript = '';
      }
    }

    if (!transcript) {
      transcript = '（ASR 转写失败，请使用手动输入）';
    }

    await prisma.employeeReply.update({
      where: { id: assignment.reply.id },
      data: { transcript },
    });

    await prisma.trainingAssignment.update({
      where: { id: assignment.id },
      data: { status: 'transcribed' },
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('转写失败:', error);
    return NextResponse.json({ error: '转写失败' }, { status: 500 });
  }
}

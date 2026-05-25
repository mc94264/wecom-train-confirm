import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractKeyPoints } from '@/lib/services/llm';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    if (!session.sourceTranscript) {
      return NextResponse.json({ error: '宣讲内容为空' }, { status: 400 });
    }

    await prisma.trainingSession.update({
      where: { id },
      data: { status: 'extracting_key_points' },
    });

    const keyPoints = await extractKeyPoints(session.sourceTranscript);

    await prisma.trainingKeyPoint.createMany({
      data: keyPoints.map((kp) => ({
        sessionId: id,
        title: kp.title,
        description: kp.description,
        keywords: kp.keywords.join(','),
        weight: 1,
      })),
    });

    const updated = await prisma.trainingSession.update({
      where: { id },
      data: { status: 'pending_admin_confirm' },
      include: { keyPoints: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('提取培训重点失败:', error);
    await prisma.trainingSession.update({
      where: { id: (await params).id },
      data: { status: 'content_ready' },
    });
    return NextResponse.json({ error: '提取培训重点失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { keyPoints } = body;

    if (!Array.isArray(keyPoints)) {
      return NextResponse.json({ error: 'keyPoints 必须是数组' }, { status: 400 });
    }

    await prisma.trainingKeyPoint.deleteMany({
      where: { sessionId: id },
    });

    await prisma.trainingKeyPoint.createMany({
      data: keyPoints.map((kp: { title: string; description?: string; keywords?: string }) => ({
        sessionId: id,
        title: kp.title,
        description: kp.description || '',
        keywords: kp.keywords || '',
        weight: 1,
      })),
    });

    const updated = await prisma.trainingSession.update({
      where: { id },
      data: { status: 'pending_admin_confirm' },
      include: { keyPoints: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('更新培训重点失败:', error);
    return NextResponse.json({ error: '更新培训重点失败' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: { keyPoints: true },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    if (session.keyPoints.length === 0) {
      return NextResponse.json({ error: '请先提取培训重点' }, { status: 400 });
    }

    const updated = await prisma.trainingSession.update({
      where: { id },
      data: { status: 'pushed' },
      include: { keyPoints: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('确认培训重点失败:', error);
    return NextResponse.json({ error: '确认培训重点失败' }, { status: 500 });
  }
}

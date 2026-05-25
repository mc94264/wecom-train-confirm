import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        keyPoints: true,
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

    return NextResponse.json(session);
  } catch (error) {
    console.error('获取培训任务失败:', error);
    return NextResponse.json({ error: '获取培训任务失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const session = await prisma.trainingSession.update({
      where: { id },
      data: {
        ...body,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('更新培训任务失败:', error);
    return NextResponse.json({ error: '更新培训任务失败' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeIds } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: '请至少选择一名员工' }, { status: 400 });
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    const existing = await prisma.trainingAssignment.findMany({
      where: { sessionId: id },
      select: { employeeId: true },
    });
    const existingIds = new Set(existing.map((e) => e.employeeId));
    const newIds = employeeIds.filter((eid: string) => !existingIds.has(eid));

    if (newIds.length > 0) {
      await prisma.trainingAssignment.createMany({
        data: newIds.map((employeeId: string) => ({
          sessionId: id,
          employeeId,
        })),
      });
    }

    const updated = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { employee: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('分配员工失败:', error);
    return NextResponse.json({ error: '分配员工失败' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const specs = await prisma.agentSpec.findMany({
    orderBy: { agentKey: 'asc' },
    include: { modelConnection: { include: { provider: true } } },
  });
  return NextResponse.json(specs);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentKey, ...data } = body;

    const spec = await prisma.agentSpec.update({
      where: { agentKey },
      data: {
        enabled: data.enabled,
        modelConnectionId: data.modelConnectionId || null,
        config: data.config ? JSON.stringify(data.config) : undefined,
      },
      include: { modelConnection: { include: { provider: true } } },
    });

    return NextResponse.json(spec);
  } catch (error) {
    console.error('更新 AgentSpec 失败:', error);
    return NextResponse.json({ error: '更新 AgentSpec 失败' }, { status: 500 });
  }
}

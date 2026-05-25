import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const configs = await prisma.serviceConfig.findMany({
    orderBy: { serviceKey: 'asc' },
  });
  return NextResponse.json(configs);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceKey, ...data } = body;

    const cfg = await prisma.serviceConfig.update({
      where: { serviceKey },
      data: {
        displayName: data.displayName,
        config: data.config ? JSON.stringify(data.config) : undefined,
        enabled: data.enabled,
      },
    });

    return NextResponse.json(cfg);
  } catch (error) {
    console.error('更新 ServiceConfig 失败:', error);
    return NextResponse.json({ error: '更新 ServiceConfig 失败' }, { status: 500 });
  }
}

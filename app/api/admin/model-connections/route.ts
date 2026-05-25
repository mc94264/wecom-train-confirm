import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveApiKey } from '@/lib/services/config';
import { generateWithCapability } from '@/lib/services/model-router';

export async function GET() {
  const connections = await prisma.modelConnection.findMany({
    orderBy: { createdAt: 'desc' },
    include: { provider: true },
  });
  return NextResponse.json(connections);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const conn = await prisma.modelConnection.create({
      data: {
        providerId: body.providerId,
        displayName: body.displayName,
        baseUrl: body.baseUrl || null,
        apiKeyRef: body.apiKeyRef,
        modelName: body.modelName,
        isDefault: body.isDefault || false,
        enabled: body.enabled ?? true,
        capabilities: JSON.stringify(body.capabilities || []),
        notes: body.notes,
      },
      include: { provider: true },
    });
    return NextResponse.json(conn, { status: 201 });
  } catch (error) {
    console.error('创建连接失败:', error);
    return NextResponse.json({ error: '创建连接失败' }, { status: 500 });
  }
}

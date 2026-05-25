import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { displayName: 'asc' },
    include: { connections: true },
  });
  return NextResponse.json(providers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = await prisma.modelProvider.create({
      data: {
        key: body.key,
        displayName: body.displayName,
        description: body.description,
        capabilities: JSON.stringify(body.capabilities || []),
        defaultBaseUrl: body.defaultBaseUrl,
      },
    });
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('创建 Provider 失败:', error);
    return NextResponse.json({ error: '创建 Provider 失败' }, { status: 500 });
  }
}

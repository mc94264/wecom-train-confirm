import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const conn = await prisma.modelConnection.update({
      where: { id },
      data: {
        displayName: body.displayName,
        baseUrl: body.baseUrl,
        apiKeyRef: body.apiKeyRef,
        modelName: body.modelName,
        isDefault: body.isDefault,
        enabled: body.enabled,
        capabilities: body.capabilities ? JSON.stringify(body.capabilities) : undefined,
        notes: body.notes,
      },
      include: { provider: true },
    });
    return NextResponse.json(conn);
  } catch (error) {
    console.error('更新连接失败:', error);
    return NextResponse.json({ error: '更新连接失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.modelConnection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除连接失败:', error);
    return NextResponse.json({ error: '删除连接失败' }, { status: 500 });
  }
}

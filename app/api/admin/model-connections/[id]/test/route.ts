import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveApiKey } from '@/lib/services/config';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conn = await prisma.modelConnection.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!conn) {
      return NextResponse.json({ error: '连接不存在' }, { status: 404 });
    }

    const start = Date.now();
    const baseUrl = conn.baseUrl || conn.provider.defaultBaseUrl || '';
    const apiKey = resolveApiKey(conn.apiKeyRef);

    const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: conn.modelName,
        messages: [
          { role: 'system', content: 'Respond with "ok" only.' },
          { role: 'user', content: 'Test connection.' },
        ],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({
        ok: false,
        latencyMs,
        message: `HTTP ${resp.status}: ${text.slice(0, 200)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      latencyMs,
      message: '连接测试通过',
    });
  } catch (error) {
    console.error('测试连接失败:', error);
    return NextResponse.json({
      ok: false,
      latencyMs: 0,
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}

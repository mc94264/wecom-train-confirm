import { NextRequest, NextResponse } from 'next/server';
import { downloadVoice } from '@/lib/services/wecom-jssdk';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export async function GET(request: NextRequest) {
  try {
    const mediaId = request.nextUrl.searchParams.get('mediaId');
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
    }

    const saveDir = resolve(process.cwd(), 'uploads', 'voices');
    if (!existsSync(saveDir)) {
      mkdirSync(saveDir, { recursive: true });
    }

    const amrPath = await downloadVoice(mediaId, saveDir);

    return NextResponse.json({
      success: true,
      amrPath,
      message: '语音下载成功',
    });
  } catch (error) {
    console.error('下载语音失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下载失败' },
      { status: 500 }
    );
  }
}

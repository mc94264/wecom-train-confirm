import { NextRequest, NextResponse } from 'next/server';
import { getJssdkConfig } from '@/lib/services/wecom-jssdk';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const config = await getJssdkConfig(url);
    return NextResponse.json(config);
  } catch (error) {
    console.error('获取 JS-SDK 配置失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取配置失败' },
      { status: 500 }
    );
  }
}

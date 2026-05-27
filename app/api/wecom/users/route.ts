import { NextResponse } from 'next/server';
import { getUserList } from '@/lib/services/wecom-contact';

export async function GET() {
  try {
    const users = await getUserList(3);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('获取通讯录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取通讯录失败' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/services/wecom-contact';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('获取通讯录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取通讯录失败' },
      { status: 500 }
    );
  }
}

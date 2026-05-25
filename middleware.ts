import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // 未设置密码则放行（开发环境）
  if (!adminPassword) {
    return NextResponse.next();
  }

  // 白名单：员工端公开 API 不需要认证
  const publicPaths = ['/api/wecom/jssdk-config'];
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('需要认证', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username !== 'admin' || password !== adminPassword) {
    return new NextResponse('密码错误', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/sessions/:path*',
    '/api/wecom/:path*',
    '/api/employees/:path*',
    '/api/admin/:path*',
  ],
};

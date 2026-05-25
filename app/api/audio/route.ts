import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

function getContentType(filePath: string): string {
  if (filePath.endsWith('.amr')) return 'audio/amr';
  if (filePath.endsWith('.wav')) return 'audio/wav';
  if (filePath.endsWith('.mp3')) return 'audio/mpeg';
  if (filePath.endsWith('.webm')) return 'audio/webm';
  return 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const decodedPath = decodeURIComponent(path);
    if (!existsSync(decodedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readFile(decodedPath);
    const contentType = getContentType(decodedPath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('读取音频失败:', error);
    return NextResponse.json({ error: '读取音频失败' }, { status: 500 });
  }
}

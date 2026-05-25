import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessToken } from '@/lib/services/wecom-jssdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { externalContactIds } = body as { externalContactIds: string[] };

    if (!externalContactIds || externalContactIds.length === 0) {
      return NextResponse.json({ error: '未选择外部客户' }, { status: 400 });
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    const contacts = await prisma.externalContact.findMany({
      where: { id: { in: externalContactIds } },
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: '未找到外部客户' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const accessToken = await getAccessToken();
    const results: { name: string; success: boolean; message: string }[] = [];

    // 按跟进成员分组
    const groupedByFollower = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const list = groupedByFollower.get(c.followUserId) || [];
      list.push(c);
      groupedByFollower.set(c.followUserId, list);
    }

    for (const [followUserId, groupContacts] of groupedByFollower) {
      const externalUserIds = groupContacts.map((c) => c.externalUserId);

      const content = `**培训效果确认**

您有一条培训确认任务：

**${session.title}**

请点击下方链接完成培训效果确认（语音复述您理解的培训重点）：

${baseUrl}/reply/external-${session.id}

⏰ 请及时完成，谢谢！`;

      try {
        const res = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_type: 'single',
              external_userid: externalUserIds,
              sender: followUserId,
              text: { content },
            }),
          }
        );

        const data = await res.json();

        for (const c of groupContacts) {
          if (data.errcode === 0) {
            results.push({
              name: c.name,
              success: true,
              message: '推送成功',
            });
          } else {
            results.push({
              name: c.name,
              success: false,
              message: `推送失败: ${data.errmsg}`,
            });
          }
        }
      } catch {
        for (const c of groupContacts) {
          results.push({
            name: c.name,
            success: false,
            message: '推送异常',
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('推送外部客户失败:', error);
    return NextResponse.json({ error: '推送失败' }, { status: 500 });
  }
}

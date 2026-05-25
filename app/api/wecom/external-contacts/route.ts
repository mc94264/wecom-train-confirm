import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessToken } from '@/lib/services/wecom-jssdk';

export async function POST() {
  try {
    const accessToken = await getAccessToken();

    // 1. 获取配置了客户联系功能的成员列表
    const followRes = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_follow_user_list?access_token=${accessToken}`
    );
    const followData = await followRes.json();

    if (followData.errcode !== 0) {
      return NextResponse.json(
        { error: `获取客户联系成员失败: ${followData.errmsg}` },
        { status: 400 }
      );
    }

    const followUsers: string[] = followData.follow_user || [];
    if (followUsers.length === 0) {
      return NextResponse.json({
        created: 0,
        updated: 0,
        total: 0,
        message: '没有配置客户联系功能的成员',
      });
    }

    let created = 0;
    let updated = 0;
    const allExternalUserIds = new Set<string>();

    // 2. 对每个成员获取其外部客户列表
    for (const userid of followUsers) {
      const listRes = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${userid}`
      );
      const listData = await listRes.json();

      if (listData.errcode !== 0) {
        console.warn(`获取成员 ${userid} 的客户列表失败:`, listData.errmsg);
        continue;
      }

      const externalUserIds: string[] = listData.external_userid || [];

      for (const euid of externalUserIds) {
        if (allExternalUserIds.has(euid)) continue;
        allExternalUserIds.add(euid);

        // 获取客户详情
        const detailRes = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get?access_token=${accessToken}&external_userid=${euid}`
        );
        const detailData = await detailRes.json();

        if (detailData.errcode !== 0) {
          console.warn(`获取客户 ${euid} 详情失败:`, detailData.errmsg);
          continue;
        }

        const contact = detailData.external_contact;
        const followInfo = detailData.follow_user?.[0];

        const existing = await prisma.externalContact.findUnique({
          where: { externalUserId: euid },
        });

        if (existing) {
          await prisma.externalContact.update({
            where: { externalUserId: euid },
            data: {
              name: contact.name || '未知',
              avatar: contact.avatar || null,
              followUserId: followInfo?.userid || userid,
              followUserName: followInfo?.remark || null,
              type: contact.type || 1,
            },
          });
          updated++;
        } else {
          await prisma.externalContact.create({
            data: {
              externalUserId: euid,
              name: contact.name || '未知',
              avatar: contact.avatar || null,
              followUserId: followInfo?.userid || userid,
              followUserName: followInfo?.remark || null,
              type: contact.type || 1,
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({
      created,
      updated,
      total: allExternalUserIds.size,
    });
  } catch (error) {
    console.error('同步外部客户失败:', error);
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const contacts = await prisma.externalContact.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

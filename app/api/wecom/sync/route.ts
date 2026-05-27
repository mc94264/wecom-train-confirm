import { NextResponse } from 'next/server';
import { getUserList } from '@/lib/services/wecom-contact';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const users = await getUserList(3);
    let created = 0;
    let updated = 0;

    for (const user of users) {
      // Skip inactive users (status 4 = 已禁用)
      if (user.status === 4) continue;

      const department = user.department?.[0];
      const existing = await prisma.employee.findFirst({
        where: { wecomUserId: user.userid },
      });

      if (existing) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: {
            name: user.name,
            phone: user.mobile || existing.phone,
            team: String(department) || existing.team,
          },
        });
        updated++;
      } else {
        await prisma.employee.create({
          data: {
            name: user.name,
            wecomUserId: user.userid,
            phone: user.mobile || null,
            team: String(department) || null,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ created, updated, total: users.length });
  } catch (error) {
    console.error('同步通讯录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '同步失败' },
      { status: 500 }
    );
  }
}

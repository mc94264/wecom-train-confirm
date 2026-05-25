import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessageToUsers } from '@/lib/services/wecom-contact';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { employee: true },
          where: { pushedAt: null },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '培训任务不存在' }, { status: 404 });
    }

    if (session.assignments.length === 0) {
      return NextResponse.json({ error: '没有待推送的员工' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const results: { employeeName: string; success: boolean; message: string; replyUrl?: string }[] = [];

    for (const assignment of session.assignments) {
      const replyUrl = `${baseUrl}/reply/${assignment.uniqueToken}`;

      if (session.demoMode) {
        await prisma.trainingAssignment.update({
          where: { id: assignment.id },
          data: { pushedAt: new Date(), status: 'not_started' },
        });
        results.push({
          employeeName: assignment.employee.name,
          success: true,
          message: '演示模式：已生成回复链接',
          replyUrl,
        });
        continue;
      }

      // 单推：使用 message/send API 发给指定员工
      if (!assignment.employee.wecomUserId) {
        results.push({
          employeeName: assignment.employee.name,
          success: false,
          message: '该员工未绑定企微账号，请同步通讯录',
        });
        continue;
      }

      const content = `**${assignment.employee.name}，您好！**\n\n您有一条培训确认任务：\n\n**${session.title}**\n\n请点击下方链接完成培训效果确认（语音复述您理解的培训重点）：\n\n[点击完成确认](${replyUrl})\n\n⏰ 请及时完成，谢谢！`;

      try {
        const res = await sendMessageToUsers(
          [assignment.employee.wecomUserId],
          content
        );

        if (res.errcode === 0) {
          await prisma.trainingAssignment.update({
            where: { id: assignment.id },
            data: { pushedAt: new Date(), status: 'not_started' },
          });
          results.push({
            employeeName: assignment.employee.name,
            success: true,
            message: '推送成功',
          });
        } else {
          results.push({
            employeeName: assignment.employee.name,
            success: false,
            message: `推送失败: ${res.errmsg}`,
          });
        }
      } catch {
        results.push({
          employeeName: assignment.employee.name,
          success: false,
          message: '推送异常',
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    await prisma.trainingSession.update({
      where: { id },
      data: { status: allSuccess ? 'collecting_replies' : session.status },
    });

    return NextResponse.json({ results, allSuccess, demoMode: session.demoMode });
  } catch (error) {
    console.error('推送失败:', error);
    return NextResponse.json({ error: '推送失败' }, { status: 500 });
  }
}

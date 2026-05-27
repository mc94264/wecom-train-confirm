import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, team, phone, employeeCode } = body;

    if (!name) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: { name, team, phone, employeeCode, isActive: true },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('创建员工失败:', error);
    return NextResponse.json({ error: '创建员工失败' }, { status: 500 });
  }
}

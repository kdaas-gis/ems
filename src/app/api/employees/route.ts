import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canViewTeamData, isAdmin } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canViewTeamData(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employee_id: { contains: search, mode: 'insensitive' } },
        { employee_code: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.role = status;
    } else {
      where.NOT = { role: 'admin' };
    }

    const employees = await prisma.employees.findMany({
      where,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        employee_id: true,
        employee_code: true,
        dob: true,
        blood_type: true,
        designation: true,
        contact_num: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      employee_id,
      employee_code,
      dob,
      blood_type,
      designation,
      contact_num,
      email,
      password,
      role,
    } = body;

    if (!name || !employee_id) {
      return NextResponse.json(
        { error: 'Name and Employee ID are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.employees.findUnique({
      where: { employee_id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 409 }
      );
    }

    if (employee_code) {
      const existingCode = await prisma.employees.findFirst({
        where: { employee_code },
        select: { employee_id: true },
      });

      if (existingCode) {
        return NextResponse.json(
          { error: 'Employee code already exists' },
          { status: 409 }
        );
      }
    }

    const employee = await withAuditActor(session.employee_id, async (tx) =>
      tx.employees.create({
        data: {
          name,
          employee_id,
          employee_code: employee_code || null,
          dob: dob ? new Date(`${dob}T00:00:00`) : null,
          blood_type: blood_type || null,
          designation: designation || null,
          contact_num: contact_num || null,
          email: email || null,
          password: password || 'temp123',
          role: role || 'employee',
        },
      })
    );

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
        dob: employee.dob,
        blood_type: employee.blood_type,
        designation: employee.designation,
        contact_num: employee.contact_num,
        email: employee.email,
        role: employee.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

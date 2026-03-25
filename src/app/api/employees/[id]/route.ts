import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canViewTeamData, isAdmin } from '@/lib/roles';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!canViewTeamData(session.role) && session.employee_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employee = await prisma.employees.findUnique({
      where: { employee_id: id },
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
        work_status: {
          orderBy: { work_date: 'desc' },
          take: 50,
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, employee_code, dob, blood_type, designation, contact_num, email, role, password } = body;

    if (employee_code) {
      const existingCode = await prisma.employees.findFirst({
        where: {
          employee_code,
          NOT: { employee_id: id },
        },
        select: { employee_id: true },
      });

      if (existingCode) {
        return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (employee_code !== undefined) updateData.employee_code = employee_code || null;
    if (dob !== undefined) updateData.dob = dob ? new Date(`${dob}T00:00:00`) : null;
    if (blood_type !== undefined) updateData.blood_type = blood_type || null;
    if (designation !== undefined) updateData.designation = designation || null;
    if (contact_num !== undefined) updateData.contact_num = contact_num;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (password !== undefined) updateData.password = password;

    const employee = await withAuditActor(session.employee_id, async (tx) =>
      tx.employees.update({
        where: { employee_id: id },
        data: updateData,
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
      })
    );

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Delete related work_status first
    await withAuditActor(session.employee_id, async (tx) => {
      await tx.work_status.deleteMany({
        where: { employee_id: id },
      });

      await tx.employees.delete({
        where: { employee_id: id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

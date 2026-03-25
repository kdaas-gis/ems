import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuditActor } from '@/lib/audit';
import { getSession } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, employee_code, designation, dob, blood_type, contact_num, email } = body as {
      name?: string;
      employee_code?: string;
      designation?: string;
      dob?: string;
      blood_type?: string;
      contact_num?: string;
      email?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (employee_code?.trim()) {
      const existingCode = await prisma.employees.findFirst({
        where: {
          employee_code: employee_code.trim(),
          NOT: { employee_id: session.employee_id },
        },
        select: { employee_id: true },
      });

      if (existingCode) {
        return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 });
      }
    }

    const employee = await withAuditActor(session.employee_id, async (tx) =>
      tx.employees.update({
        where: { employee_id: session.employee_id },
        data: {
          name: name.trim(),
          employee_code: employee_code?.trim() || null,
          designation: designation?.trim() || null,
          dob: dob ? new Date(`${dob}T00:00:00`) : null,
          blood_type: blood_type?.trim().toUpperCase() || null,
          contact_num: contact_num?.trim() || null,
          email: email?.trim() || null,
        },
        select: {
          id: true,
          employee_id: true,
          employee_code: true,
          name: true,
          email: true,
          role: true,
          dob: true,
          blood_type: true,
          designation: true,
          contact_num: true,
        },
      })
    );

    return NextResponse.json({ user: employee, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuditActor } from '@/lib/audit';
import { getSession, hashPassword, comparePassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const employee = await prisma.employees.findUnique({
      where: { employee_id: session.employee_id },
    });

    if (!employee || !employee.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password (support temp plaintext or hashed)
    let isValid = false;
    if (employee.password.startsWith('$2')) {
      isValid = await comparePassword(currentPassword, employee.password);
    } else {
      isValid = currentPassword === employee.password;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    await withAuditActor(session.employee_id, async (tx) =>
      tx.employees.update({
        where: { employee_id: session.employee_id },
        data: { password: hashedPassword },
      })
    );

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

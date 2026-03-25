import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { getInclusiveLeaveDays } from '@/lib/leave';
import { canApproveLeave } from '@/lib/roles';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = parseInt(id);

    const existing = await prisma.leave_request.findUnique({
      where: { id: leaveId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (canApproveLeave(session.role)) {
      const { status, admin_comment } = body as {
        status?: string;
        admin_comment?: string;
      };

      if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      if (status !== undefined) updateData.status = status;
      if (admin_comment !== undefined) updateData.admin_comment = admin_comment || null;
    } else {
      if (existing.employee_id !== session.employee_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (existing.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending leave requests can be updated' },
          { status: 400 }
        );
      }

      const {
        leave_type,
        start_date,
        end_date,
        reason,
      } = body as {
        leave_type?: string;
        start_date?: string;
        end_date?: string;
        reason?: string;
      };

      if (start_date && end_date && getInclusiveLeaveDays(start_date, end_date) <= 0) {
        return NextResponse.json(
          { error: 'End date must be on or after start date' },
          { status: 400 }
        );
      }

      if (leave_type !== undefined) updateData.leave_type = leave_type;
      if (start_date !== undefined) updateData.start_date = new Date(`${start_date}T00:00:00`);
      if (end_date !== undefined) updateData.end_date = new Date(`${end_date}T00:00:00`);
      if (reason !== undefined) updateData.reason = reason || null;
    }

    const updated = await withAuditActor(session.employee_id, async (tx) =>
      tx.leave_request.update({
        where: { id: leaveId },
        data: updateData,
        include: {
          employee: {
            select: {
              name: true,
              employee_id: true,
            },
          },
        },
      })
    );

    return NextResponse.json({
      request: {
        ...updated,
        totalDays: getInclusiveLeaveDays(updated.start_date, updated.end_date),
      },
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = parseInt(id);

    const existing = await prisma.leave_request.findUnique({
      where: { id: leaveId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (!canApproveLeave(session.role) && existing.employee_id !== session.employee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canApproveLeave(session.role) && existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be cancelled' },
        { status: 400 }
      );
    }

    await withAuditActor(session.employee_id, async (tx) =>
      tx.leave_request.delete({
        where: { id: leaveId },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete leave request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

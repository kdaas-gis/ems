import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canAssignWork } from '@/lib/roles';
import { getStartOfDay } from '@/lib/attendance';

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
    const body = await request.json();
    const { task, status, description, work_date, project_id } = body;

    const existing = await prisma.work_status.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    if (!canAssignWork(session.role)) {
      if (existing.employee_id !== session.employee_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Restrict editing to the same day
      const today = getStartOfDay();
      const logDate = getStartOfDay(existing.work_date || new Date());

      if (logDate < today) {
        return NextResponse.json(
          { error: 'You can only edit work logs on the same day they are scheduled for.' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (task !== undefined) updateData.task = task;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (work_date !== undefined) updateData.work_date = new Date(work_date);
    if (project_id !== undefined) updateData.project_id = project_id ? parseInt(project_id) : null;

    const workLog = await withAuditActor(session.employee_id, async (tx) =>
      tx.work_status.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          employee: {
            select: { name: true, employee_id: true },
          },
          project: {
            select: { id: true, name: true, code: true, status: true },
          },
        },
      })
    );

    return NextResponse.json({ workLog });
  } catch (error) {
    console.error('Update work log error:', error);
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

    const existing = await prisma.work_status.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    if (!canAssignWork(session.role)) {
      if (existing.employee_id !== session.employee_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Restrict deletion to the same day
      const today = getStartOfDay();
      const logDate = getStartOfDay(existing.work_date || new Date());

      if (logDate < today) {
        return NextResponse.json(
          { error: 'You can only delete work logs on the same day they are scheduled for.' },
          { status: 403 }
        );
      }
    }

    await withAuditActor(session.employee_id, async (tx) =>
      tx.work_status.delete({
        where: { id: parseInt(id) },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete work log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

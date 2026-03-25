import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canAssignWork } from '@/lib/roles';
import { syncCompletedTaskToWorkLog } from '@/lib/tasks';

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
    const taskId = parseInt(id);
    const body = await request.json();

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (canAssignWork(session.role)) {
      const { title, description, project_id, priority, due_date, employee_ids } = body as {
        title?: string;
        description?: string;
        project_id?: string | number | null;
        priority?: string;
        due_date?: string;
        employee_ids?: string[];
      };

      const task = await withAuditActor(session.employee_id, async (tx) =>
        tx.task.update({
          where: { id: taskId },
          data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(description !== undefined ? { description: description || null } : {}),
            ...(project_id !== undefined ? { project_id: project_id ? parseInt(String(project_id)) : null } : {}),
            ...(priority !== undefined ? { priority } : {}),
            ...(due_date !== undefined ? { due_date: due_date ? new Date(`${due_date}T00:00:00`) : null } : {}),
            ...(employee_ids
              ? {
                  assignments: {
                    deleteMany: {},
                    create: employee_ids.map((employee_id) => ({
                      employee_id,
                      status: 'todo',
                    })),
                  },
                }
              : {}),
          },
          include: {
            project: {
              select: { id: true, name: true, code: true, status: true },
            },
            creator: {
              select: { employee_id: true, name: true },
            },
            assignments: {
              include: {
                employee: {
                  select: { employee_id: true, name: true, role: true },
                },
              },
              orderBy: [{ status: 'asc' }, { employee: { name: 'asc' } }],
            },
          },
        })
      );

      return NextResponse.json({ task });
    }

    const { status, remarks } = body as {
      status?: string;
      remarks?: string;
    };

    if (!status || !['todo', 'in-progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
    }

    const existingAssignment = existingTask.assignments.find(
      (assignment) => assignment.employee_id === session.employee_id
    );

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await withAuditActor(session.employee_id, async (tx) => {
      const updatedAssignment = await tx.task_assignment.update({
        where: {
          task_id_employee_id: {
            task_id: taskId,
            employee_id: session.employee_id,
          },
        },
        data: {
          status,
          remarks: remarks || null,
          completed_at: status === 'completed' ? new Date() : null,
        },
        include: {
          employee: {
            select: { employee_id: true, name: true, role: true },
          },
        },
      });

      if (status === 'completed') {
        await syncCompletedTaskToWorkLog(taskId, session.employee_id, tx);
      }

      return updatedAssignment;
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !canAssignWork(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const taskId = parseInt(id);

    await withAuditActor(session.employee_id, async (tx) => {
      await tx.task_assignment.deleteMany({
        where: { task_id: taskId },
      });

      await tx.task.delete({
        where: { id: taskId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

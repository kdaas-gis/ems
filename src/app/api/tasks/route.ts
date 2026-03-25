import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canAssignWork, canViewTeamData } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employee_id') || '';
    const projectId = searchParams.get('project_id') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    if (!canViewTeamData(session.role)) {
      where.assignments = {
        some: {
          employee_id: session.employee_id,
        },
      };
    } else if (employeeId) {
      where.assignments = {
        some: {
          employee_id: employeeId,
        },
      };
    }

    if (status) {
      where.assignments = {
        ...(typeof where.assignments === 'object' ? where.assignments : {}),
        some: {
          ...((typeof where.assignments === 'object' && where.assignments && 'some' in where.assignments)
            ? (where.assignments as { some: Record<string, unknown> }).some
            : {}),
          ...(employeeId ? { employee_id: employeeId } : {}),
          status,
        },
      };
    }

    if (projectId) {
      where.project_id = parseInt(projectId);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
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
    });

    const summary = {
      total: tasks.length,
      todo: tasks.filter((task) => task.assignments.some((assignment) => assignment.status === 'todo')).length,
      inProgress: tasks.filter((task) => task.assignments.some((assignment) => assignment.status === 'in-progress')).length,
      completed: tasks.filter((task) => task.assignments.length > 0 && task.assignments.every((assignment) => assignment.status === 'completed')).length,
    };

    return NextResponse.json({ tasks, summary });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !canAssignWork(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, project_id, priority, due_date, employee_ids } = body as {
      title?: string;
      description?: string;
      project_id?: string | number | null;
      priority?: string;
      due_date?: string;
      employee_ids?: string[];
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    if (!employee_ids?.length) {
      return NextResponse.json({ error: 'Assign at least one employee' }, { status: 400 });
    }

    const task = await withAuditActor(session.employee_id, async (tx) =>
      tx.task.create({
        data: {
          title: title.trim(),
          description: description || null,
          project_id: project_id ? parseInt(String(project_id)) : null,
          created_by: session.employee_id,
          priority: priority || 'medium',
          due_date: due_date ? new Date(`${due_date}T00:00:00`) : null,
          assignments: {
            create: employee_ids.map((employee_id) => ({
              employee_id,
              status: 'todo',
            })),
          },
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

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

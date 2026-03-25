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
    const employeeId = searchParams.get('employee_id') || '';
    const projectId = searchParams.get('project_id') || '';
    const date = searchParams.get('date') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    // Non-admin can only see their own logs
    if (!canViewTeamData(session.role)) {
      where.employee_id = session.employee_id;
    } else if (employeeId) {
      where.employee_id = employeeId;
    }

    if (date) {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      where.work_date = {
        gte: dateObj,
        lt: nextDay,
      };
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.project_id = parseInt(projectId);
    }

    const [workLogs, total] = await Promise.all([
      prisma.work_status.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: { name: true, employee_id: true },
          },
          project: {
            select: { id: true, name: true, code: true, status: true },
          },
        },
      }),
      prisma.work_status.count({ where }),
    ]);

    return NextResponse.json({
      workLogs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get work logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employee_id, project_id, work_date, task, status, description } = body;

    // Non-admin can only log their own work
    const targetEmployeeId = canAssignWork(session.role) && employee_id
      ? employee_id
      : session.employee_id;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    const workLog = await withAuditActor(session.employee_id, async (tx) =>
      tx.work_status.create({
        data: {
          employee_id: targetEmployeeId,
          project_id: project_id ? parseInt(project_id) : null,
          work_date: work_date ? new Date(work_date) : new Date(),
          task,
          status: status || 'in-progress',
          description: description || null,
          created_at: new Date(),
        },
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

    return NextResponse.json({ workLog }, { status: 201 });
  } catch (error) {
    console.error('Create work log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

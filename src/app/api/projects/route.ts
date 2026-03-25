import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canManageProjects, canViewTeamData } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (!canViewTeamData(session.role)) {
      where.assignments = {
        some: {
          employee_id: session.employee_id,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: {
        assignments: {
          include: {
            employee: {
              select: {
                employee_id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            employee: {
              name: 'asc',
            },
          },
        },
        _count: {
          select: {
            work_logs: true,
            assignments: true,
          },
        },
      },
    });

    const summary = {
      total: projects.length,
      active: projects.filter((project) => project.status === 'active').length,
      completed: projects.filter((project) => project.status === 'completed').length,
      onHold: projects.filter((project) => project.status === 'on-hold').length,
    };

    return NextResponse.json({ projects, summary });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !canManageProjects(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, status, start_date, end_date, employee_ids } = body as {
      name?: string;
      code?: string;
      description?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      employee_ids?: string[];
    };

    if (!name || !code) {
      return NextResponse.json({ error: 'Project name and code are required' }, { status: 400 });
    }

    const existing = await prisma.project.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: 'Project code already exists' }, { status: 409 });
    }

    const project = await withAuditActor(session.employee_id, async (tx) =>
      tx.project.create({
        data: {
          name,
          code,
          description: description || null,
          status: status || 'active',
          start_date: start_date ? new Date(`${start_date}T00:00:00`) : null,
          end_date: end_date ? new Date(`${end_date}T00:00:00`) : null,
          assignments: employee_ids?.length
            ? {
                create: employee_ids.map((employee_id) => ({
                  employee_id,
                })),
              }
            : undefined,
        },
        include: {
          assignments: {
            include: {
              employee: {
                select: {
                  employee_id: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              employee: {
                name: 'asc',
              },
            },
          },
          _count: {
            select: {
              work_logs: true,
              assignments: true,
            },
          },
        },
      })
    );

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

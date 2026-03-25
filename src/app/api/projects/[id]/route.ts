import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { canManageProjects } from '@/lib/roles';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !canManageProjects(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
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

    if (code) {
      const existing = await prisma.project.findFirst({
        where: {
          code,
          NOT: { id: projectId },
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'Project code already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description || null;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(`${start_date}T00:00:00`) : null;
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(`${end_date}T00:00:00`) : null;

    const project = await withAuditActor(session.employee_id, async (tx) =>
      tx.project.update({
        where: { id: projectId },
        data: {
          ...updateData,
          assignments: employee_ids
            ? {
                deleteMany: {},
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

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !canManageProjects(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    await withAuditActor(session.employee_id, async (tx) => {
      await tx.work_status.updateMany({
        where: { project_id: projectId },
        data: { project_id: null },
      });

      await tx.project_assignment.deleteMany({
        where: { project_id: projectId },
      });

      await tx.project.delete({
        where: { id: projectId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

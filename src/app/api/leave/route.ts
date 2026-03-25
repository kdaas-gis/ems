import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { getInclusiveLeaveDays } from '@/lib/leave';
import { canViewTeamData } from '@/lib/roles';
import type { leave_request } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employee_id') || '';

    const where: Record<string, unknown> = {};

    if (!canViewTeamData(session.role)) {
      where.employee_id = session.employee_id;
    } else if (employeeId) {
      where.employee_id = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.leave_request.findMany({
      where,
      orderBy: [{ created_at: 'desc' }],
      include: {
        employee: {
          select: {
            name: true,
            employee_id: true,
          },
        },
      },
    });

    const enrichedRequests = requests.map((request: leave_request & {
      employee: {
        name: string;
        employee_id: string;
      };
    }) => ({
      ...request,
      totalDays: getInclusiveLeaveDays(request.start_date, request.end_date),
    }));

    const summary = {
      total: enrichedRequests.length,
      pending: enrichedRequests.filter((request: typeof enrichedRequests[number]) => request.status === 'pending').length,
      approved: enrichedRequests.filter((request: typeof enrichedRequests[number]) => request.status === 'approved').length,
      rejected: enrichedRequests.filter((request: typeof enrichedRequests[number]) => request.status === 'rejected').length,
    };

    return NextResponse.json({ requests: enrichedRequests, summary });
  } catch (error) {
    console.error('Get leave requests error:', error);
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

    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Leave type, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (getInclusiveLeaveDays(start_date, end_date) <= 0) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    const leaveRequest = await withAuditActor(session.employee_id, async (tx) =>
      tx.leave_request.create({
        data: {
          employee_id: session.employee_id,
          leave_type,
          start_date: new Date(`${start_date}T00:00:00`),
          end_date: new Date(`${end_date}T00:00:00`),
          reason: reason || null,
          status: 'pending',
        },
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

    return NextResponse.json(
      {
        request: {
          ...leaveRequest,
          totalDays: getInclusiveLeaveDays(leaveRequest.start_date, leaveRequest.end_date),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create leave request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { withAuditActor } from '@/lib/audit';
import { getDurationHours, getEndOfDay, getStartOfDay } from '@/lib/attendance';
import { canViewTeamData } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const employeeId = searchParams.get('employee_id') || '';
    const startOfDay = getStartOfDay(date);
    const endOfDay = getEndOfDay(date);

    const where: Record<string, unknown> = {
      attendance_date: {
        gte: startOfDay,
        lt: endOfDay,
      },
    };

    if (!canViewTeamData(session.role)) {
      where.employee_id = session.employee_id;
    } else if (employeeId) {
      where.employee_id = employeeId;
    }

    const [records, currentUserRecord] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: [{ check_in: 'asc' }, { created_at: 'asc' }],
        include: {
          employee: {
            select: {
              name: true,
              employee_id: true,
            },
          },
        },
      }),
      prisma.attendance.findFirst({
        where: {
          employee_id: session.employee_id,
          attendance_date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
    ]);

    const enrichedRecords = records.map((record) => ({
      ...record,
      totalHours: getDurationHours(record.check_in, record.check_out),
    }));

    const summary = {
      totalPresent: enrichedRecords.length,
      checkedOut: enrichedRecords.filter((record) => record.check_out).length,
      workingNow: enrichedRecords.filter((record) => record.check_in && !record.check_out).length,
    };

    return NextResponse.json({
      date,
      records: enrichedRecords,
      summary,
      currentUserRecord: currentUserRecord
        ? {
            ...currentUserRecord,
            totalHours: getDurationHours(currentUserRecord.check_in, currentUserRecord.check_out),
          }
        : null,
      canCheckIn: !currentUserRecord,
      canCheckOut: Boolean(currentUserRecord?.check_in && !currentUserRecord?.check_out),
    });
  } catch (error) {
    console.error('Get attendance error:', error);
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
    const action = body.action;

    if (action !== 'check-in' && action !== 'check-out') {
      return NextResponse.json({ error: 'Invalid attendance action' }, { status: 400 });
    }

    const now = new Date();
    const attendanceDate = getStartOfDay(now);

    const existingRecord = await prisma.attendance.findUnique({
      where: {
        employee_id_attendance_date: {
          employee_id: session.employee_id,
          attendance_date: attendanceDate,
        },
      },
      include: {
        employee: {
          select: {
            name: true,
            employee_id: true,
          },
        },
      },
    });

    if (action === 'check-in') {
      if (existingRecord) {
        return NextResponse.json(
          { error: 'You are already checked in for today' },
          { status: 409 }
        );
      }

      const record = await withAuditActor(session.employee_id, async (tx) =>
        tx.attendance.create({
          data: {
            employee_id: session.employee_id,
            attendance_date: attendanceDate,
            check_in: now,
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

      return NextResponse.json({
        record: {
          ...record,
          totalHours: null,
        },
        message: 'Checked in successfully',
      });
    }

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'You need to check in before checking out' },
        { status: 400 }
      );
    }

    if (existingRecord.check_out) {
      return NextResponse.json(
        { error: 'You are already checked out for today' },
        { status: 409 }
      );
    }

    const record = await withAuditActor(session.employee_id, async (tx) =>
      tx.attendance.update({
        where: { id: existingRecord.id },
        data: {
          check_out: now,
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

    return NextResponse.json({
      record: {
        ...record,
        totalHours: getDurationHours(record.check_in, record.check_out),
      },
      message: 'Checked out successfully',
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

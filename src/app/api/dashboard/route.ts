import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDurationHours } from '@/lib/attendance';
import { canViewTeamData } from '@/lib/roles';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const canSeeTeamSnapshot = canViewTeamData(session.role);

    const [
      totalEmployees,
      todayLogs,
      totalLogs,
      recentLogs,
      todayCompleted,
      activeToday,
      currentUserAttendance,
      assignedProjects,
      activeProjects,
      myTodayLogs,
      myCompletedLogs,
      myTaskAssignments,
    ] = await Promise.all([
      canSeeTeamSnapshot ? prisma.employees.count() : Promise.resolve(0),
      canSeeTeamSnapshot
        ? prisma.work_status.count({
            where: {
              work_date: { gte: today, lt: tomorrow },
            },
          })
        : Promise.resolve(0),
      canSeeTeamSnapshot ? prisma.work_status.count() : Promise.resolve(0),
      prisma.work_status.findMany({
        where: canSeeTeamSnapshot ? {} : { employee_id: session.employee_id },
        orderBy: { created_at: 'desc' },
        take: canSeeTeamSnapshot ? 10 : 6,
        include: {
          employee: {
            select: { name: true, employee_id: true },
          },
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      canSeeTeamSnapshot
        ? prisma.work_status.count({
            where: {
              work_date: { gte: today, lt: tomorrow },
              status: 'completed',
            },
          })
        : Promise.resolve(0),
      canSeeTeamSnapshot
        ? prisma.work_status.findMany({
            where: {
              work_date: { gte: today, lt: tomorrow },
            },
            select: { employee_id: true },
            distinct: ['employee_id'],
          })
        : Promise.resolve([]),
      prisma.attendance.findUnique({
        where: {
          employee_id_attendance_date: {
            employee_id: session.employee_id,
            attendance_date: today,
          },
        },
      }),
      prisma.project.findMany({
        where:
          canSeeTeamSnapshot
            ? {}
            : {
                assignments: {
                  some: {
                    employee_id: session.employee_id,
                  },
                },
              },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        take: canSeeTeamSnapshot ? 5 : 6,
        include: {
          assignments: {
            include: {
              employee: {
                select: {
                  employee_id: true,
                  name: true,
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
      }),
      canSeeTeamSnapshot
        ? prisma.project.count({
            where: {
              status: 'active',
            },
          })
        : Promise.resolve(0),
      prisma.work_status.count({
        where: {
          employee_id: session.employee_id,
          work_date: { gte: today, lt: tomorrow },
        },
      }),
      prisma.work_status.count({
        where: {
          employee_id: session.employee_id,
          work_date: { gte: today, lt: tomorrow },
          status: 'completed',
        },
      }),
      prisma.task_assignment.findMany({
        where: {
          employee_id: session.employee_id,
        },
        orderBy: [{ updated_at: 'desc' }],
        take: 6,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              priority: true,
              due_date: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const todayInProgress = todayLogs - todayCompleted;
    const myInProgressLogs = myTodayLogs - myCompletedLogs;
    const taskSummary = {
      total: myTaskAssignments.length,
      todo: myTaskAssignments.filter((assignment) => assignment.status === 'todo').length,
      inProgress: myTaskAssignments.filter((assignment) => assignment.status === 'in-progress').length,
      completed: myTaskAssignments.filter((assignment) => assignment.status === 'completed').length,
    };

    return NextResponse.json({
      roleScope: canSeeTeamSnapshot ? 'team' : 'employee',
      stats: canSeeTeamSnapshot
        ? {
            totalEmployees,
            activeToday: activeToday.length,
            todayLogs,
            todayCompleted,
            todayInProgress,
            totalLogs,
            activeProjects,
          }
        : null,
      myStats: {
        todayLogs: myTodayLogs,
        completedLogs: myCompletedLogs,
        inProgressLogs: myInProgressLogs,
        assignedProjects: assignedProjects.length,
      },
      taskSummary,
      myTasks: myTaskAssignments,
      attendance: {
        currentUserRecord: currentUserAttendance
          ? {
              ...currentUserAttendance,
              totalHours: getDurationHours(
                currentUserAttendance.check_in,
                currentUserAttendance.check_out
          ),
            }
          : null,
        canCheckIn: !currentUserAttendance,
        canCheckOut: Boolean(currentUserAttendance?.check_in && !currentUserAttendance?.check_out),
      },
      projects: assignedProjects,
      recentLogs,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

'use client';

import Link from 'next/link';
import { Users, ClipboardList, Clock, Activity, CalendarCheck, Briefcase, ListTodo, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canViewTeamData } from '@/lib/roles';

interface DashboardStats {
  totalEmployees: number;
  activeToday: number;
  todayLogs: number;
  todayCompleted: number;
  todayInProgress: number;
  totalLogs: number;
  activeProjects: number;
}


interface MyStats {
  todayLogs: number;
  completedLogs: number;
  inProgressLogs: number;
  assignedProjects: number;
}

interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
}

interface MyTask {
  id: number;
  status: string;
  updated_at: string | null;
  task: {
    id: number;
    title: string;
    priority: string;
    due_date: string | null;
    project?: { id: number; name: string; code: string } | null;
  };
}

interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  assignments: {
    employee: {
      employee_id: string;
      name: string;
    };
  }[];
  _count: {
    work_logs: number;
    assignments: number;
  };
}

interface RecentLog {
  id: number;
  employee_id: string;
  work_date: string;
  task: string;
  status: string;
  description: string;
  created_at: string;
  employee: { name: string; employee_id: string };
  project?: { id: number; name: string; code: string } | null;
}


export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeTeamSnapshot = canViewTeamData(user?.role);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiFetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setMyStats(data.myStats);
        setTaskSummary(data.taskSummary);
        setMyTasks(data.myTasks ?? []);
        setRecentLogs(data.recentLogs);
        setProjects(data.projects ?? []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };


  const statCards = [
    {
      label: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      label: 'Active Today',
      value: stats?.activeToday || 0,
      icon: Activity,
      color: 'bg-slate-700',
    },
    {
      label: 'Tasks Today',
      value: stats?.todayLogs || 0,
      icon: ClipboardList,
      color: 'bg-blue-800',
    },
    {
      label: 'Completed Today',
      value: stats?.todayCompleted || 0,
      icon: Clock,
      color: 'bg-emerald-600',
    },
    {
      label: 'Active Projects',
      value: stats?.activeProjects || 0,
      icon: Briefcase,
      color: 'bg-cyan-600',
    },
  ];

  const employeeStatCards = [
    {
      label: 'My Logs Today',
      value: myStats?.todayLogs || 0,
      icon: ClipboardList,
      color: 'bg-blue-600',
    },
    {
      label: 'Completed Today',
      value: myStats?.completedLogs || 0,
      icon: Clock,
      color: 'bg-emerald-600',
    },
    {
      label: 'In Progress',
      value: myStats?.inProgressLogs || 0,
      icon: Activity,
      color: 'bg-amber-600',
    },
    {
      label: 'Assigned Projects',
      value: myStats?.assignedProjects || 0,
      icon: Briefcase,
      color: 'bg-cyan-600',
    },
  ];

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm font-medium">
          {canSeeTeamSnapshot
            ? `Overview of employee activities, attendance, and project progress — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
            : `Your tasks, updates, and assigned projects for ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        </p>
      </div>

      {!canSeeTeamSnapshot && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {employeeStatCards.map((card) => (
              <div
                key={card.label}
                className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center shadow-md text-white mb-4`}>
                  <card.icon size={24} strokeWidth={2.5} />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{card.value}</p>
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Tasks</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Keep track of what is assigned to you today</p>
                </div>
                <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors">
                  Open Tasks <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5 text-center">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total</p>
                  <p className="font-bold text-slate-900">{taskSummary?.total || 0}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">To Do</p>
                  <p className="font-bold text-amber-800">{taskSummary?.todo || 0}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">In Progress</p>
                  <p className="font-bold text-blue-800">{taskSummary?.inProgress || 0}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Done</p>
                  <p className="font-bold text-emerald-800">{taskSummary?.completed || 0}</p>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                  <ListTodo size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No tasks assigned yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Your assigned tasks from team leads and admins will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((assignment) => (
                    <div key={`${assignment.task.id}-${assignment.id}`} className="rounded-lg border border-slate-200 px-4 py-4 bg-slate-50/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{assignment.task.title}</p>
                          {assignment.task.project && (
                            <p className="text-xs text-cyan-700 font-semibold mt-1">{assignment.task.project.code} · {assignment.task.project.name}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                          assignment.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : assignment.status === 'in-progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {assignment.status === 'in-progress' ? 'In Progress' : assignment.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs font-semibold text-slate-600">
                        <span>Priority: {assignment.task.priority}</span>
                        <span>Due: {assignment.task.due_date ? new Date(assignment.task.due_date).toLocaleDateString('en-IN') : 'Any time'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Recent Work</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">A quick look at the updates you logged recently</p>
                </div>
                <Link href="/work-logs" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors">
                  Open Work Logs <ArrowRight size={14} />
                </Link>
              </div>

              {recentLogs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                  <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No work updates logged yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Add a work log after you start working so your day stays easy to track.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 px-4 py-4 bg-slate-50/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.task}</p>
                          {log.project && (
                            <p className="text-xs text-cyan-700 font-semibold mt-1">{log.project.code} · {log.project.name}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                          log.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {log.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {log.work_date ? new Date(log.work_date).toLocaleDateString('en-IN') : '—'}
                      </p>
                      {log.description && (
                        <p className="text-xs text-slate-600 mt-2">{log.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {canSeeTeamSnapshot && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:border-blue-200 transition-all duration-300 hover:-translate-y-0.5 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center shadow-md transition-transform duration-300 text-white`}>
                <card.icon size={24} strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{card.value}</p>
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Project Snapshot</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                A quick look at active team work from the dashboard
              </p>
            </div>
            <Link href="/projects" className="text-sm font-bold text-cyan-700 hover:text-cyan-800 transition-colors">
              Open Projects
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {canSeeTeamSnapshot ? 'No projects created yet.' : 'No projects assigned yet.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {canSeeTeamSnapshot
                  ? 'Create a project to start assigning team members and linking work logs.'
                  : 'Ask an admin to assign you to a project so it appears here and in work logs.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="rounded-lg border border-slate-200 px-4 py-4 bg-slate-50/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{project.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{project.code}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                      project.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : project.status === 'on-hold'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}>
                      {project.status === 'on-hold' ? 'On Hold' : project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs font-semibold text-slate-600">
                    <span>{project._count.work_logs} work logs</span>
                    <span>{project._count.assignments} members</span>
                    {project.start_date && (
                      <span>Starts {new Date(project.start_date).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                <CalendarCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Attendance Board</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Review today&apos;s attendance summary and open the full team board
                </p>
              </div>
            </div>
            <Link
              href="/attendance"
              className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
            >
              Open Attendance
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Present</p>
              <p className="font-bold text-slate-900">{stats?.activeToday || 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Task Updates</p>
              <p className="font-bold text-slate-900">{stats?.todayLogs || 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Completed</p>
              <p className="font-bold text-slate-900">{stats?.todayCompleted || 0}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Open the attendance page to review the full team board, filters, and daily attendance details.</p>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Quick stats bar */}
      {canSeeTeamSnapshot && stats && stats.todayLogs > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Today&apos;s Progress</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-1000"
                style={{ width: `${stats.todayLogs > 0 ? (stats.todayCompleted / stats.todayLogs) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-900">
              {stats.todayLogs > 0 ? Math.round((stats.todayCompleted / stats.todayLogs) * 100) : 0}%
            </span>
          </div>
          <div className="flex gap-6 mt-4 text-xs font-semibold uppercase tracking-wide">
            <span className="flex items-center gap-2 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              {stats.todayCompleted} Completed
            </span>
            <span className="flex items-center gap-2 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              {stats.todayInProgress} In Progress
            </span>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {canSeeTeamSnapshot && (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Latest work logs across the team</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <ClipboardList size={48} className="mx-auto mb-3 text-slate-300" strokeWidth={1} />
                    No work logs yet. Start tracking today!
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {log.employee?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.employee?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 font-mono font-medium">{log.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{log.task}</p>
                      {log.project && (
                        <p className="text-[11px] text-cyan-700 font-bold uppercase tracking-wide mt-1">
                          {log.project.code} · {log.project.name}
                        </p>
                      )}
                      {log.description && (
                        <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">{log.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {log.work_date ? new Date(log.work_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                        log.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.status === 'completed' ? 'bg-emerald-600' : 'bg-amber-600'
                        }`} />
                        {log.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

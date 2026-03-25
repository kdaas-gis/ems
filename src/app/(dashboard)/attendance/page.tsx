'use client';

import { CalendarCheck, Clock3, LogIn, LogOut, RefreshCcw, UserCheck, History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getLocalDateString } from '@/lib/date';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/context/AuthContext';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canViewTeamData } from '@/lib/roles';

interface AttendanceRecord {
  id: number;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  totalHours: number | null;
  employee: {
    name: string;
    employee_id: string;
  };
}

interface AttendanceSummary {
  totalPresent: number;
  checkedOut: number;
  workingNow: number;
}

interface EmployeeOption {
  employee_id: string;
  name: string;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHours(value: number | null) {
  if (value === null) return '—';
  return `${value.toFixed(1)}h`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(getLocalDateString());
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalPresent: 0,
    checkedOut: 0,
    workingNow: 0,
  });
  const [currentUserRecord, setCurrentUserRecord] = useState<AttendanceRecord | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canViewTeamAttendance = canViewTeamData(user?.role);
  const employeeOptions: SelectOption[] = employees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.name} (${employee.employee_id})`,
  }));

  const fetchEmployees = useCallback(async () => {
    if (!canViewTeamAttendance) return;

    try {
      const res = await apiFetch('/api/employees');
      if (!res.ok) return;

      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (err) {
      console.error('Attendance employee fetch error:', err);
    }
  }, [canViewTeamAttendance]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (canViewTeamAttendance && employeeFilter) params.set('employee_id', employeeFilter);

      const res = await apiFetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load attendance');
      }

      setRecords(data.records ?? []);
      setSummary(data.summary ?? { totalPresent: 0, checkedOut: 0, workingNow: 0 });
      setCurrentUserRecord(data.currentUserRecord ?? null);
      setCanCheckIn(Boolean(data.canCheckIn));
      setCanCheckOut(Boolean(data.canCheckOut));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [date, employeeFilter, canViewTeamAttendance]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleAttendanceAction = async (action: 'check-in' | 'check-out') => {
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Attendance action failed');
      }

      setMessage(data.message);
      await fetchAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attendance action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statCards = [
    {
      label: 'Present Today',
      value: summary.totalPresent,
      icon: UserCheck,
      color: 'bg-emerald-600',
    },
    {
      label: 'Working Now',
      value: summary.workingNow,
      icon: Clock3,
      color: 'bg-blue-600',
    },
    {
      label: 'Checked Out',
      value: summary.checkedOut,
      icon: LogOut,
      color: 'bg-slate-700',
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Attendance</h1>
          <p className="text-slate-500 text-sm font-medium">
            {canViewTeamAttendance
              ? 'Monitor team presence, check-outs, and daily attendance status'
              : 'Track your check-ins, check-outs, and daily attendance history'}
          </p>
        </div>

        {!canViewTeamAttendance && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm min-w-[320px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <CalendarCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">My Attendance</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {new Date(date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Check In</p>
                <p className="font-bold text-slate-900">{formatTime(currentUserRecord?.check_in ?? null)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Check Out</p>
                <p className="font-bold text-slate-900">{formatTime(currentUserRecord?.check_out ?? null)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Hours</p>
                <p className="font-bold text-slate-900">{formatHours(currentUserRecord?.totalHours ?? null)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAttendanceAction('check-in')}
                disabled={submitting || !canCheckIn}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogIn size={16} />
                Check In
              </button>
              <button
                onClick={() => handleAttendanceAction('check-out')}
                disabled={submitting || !canCheckOut}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogOut size={16} />
                Check Out
              </button>
            </div>

            {message && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                {message}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {canViewTeamAttendance ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className={`w-11 h-11 rounded-lg ${card.color} flex items-center justify-center text-white mb-4`}>
                <card.icon size={22} />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{card.value}</p>
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center text-white mb-4">
              <CalendarCheck size={22} />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{formatTime(currentUserRecord?.check_in ?? null)}</p>
            <p className="text-sm font-semibold text-slate-500">Today&apos;s Check In</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="w-11 h-11 rounded-lg bg-slate-900 flex items-center justify-center text-white mb-4">
              <LogOut size={22} />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{formatTime(currentUserRecord?.check_out ?? null)}</p>
            <p className="text-sm font-semibold text-slate-500">Today&apos;s Check Out</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="w-11 h-11 rounded-lg bg-emerald-600 flex items-center justify-center text-white mb-4">
              <Clock3 size={22} />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{formatHours(currentUserRecord?.totalHours ?? null)}</p>
            <p className="text-sm font-semibold text-slate-500">Hours for Selected Day</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <label htmlFor="attendance-date" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
            Date
          </label>
          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="text-sm py-2"
          />
        </div>

        {canViewTeamAttendance && (
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <label htmlFor="attendance-employee" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Employee
            </label>
            <AppSelect
              inputId="attendance-employee"
              options={employeeOptions}
              value={employeeOptions.find((option) => option.value === employeeFilter) ?? null}
              onChange={(option) => setEmployeeFilter((option as SelectOption | null)?.value ?? '')}
              placeholder="All Employees"
              isClearable
            />
          </div>
        )}

        <button
          onClick={() => {
            setDate(getLocalDateString());
            setEmployeeFilter('');
            setMessage('');
            setError('');
          }}
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Reset
        </button>
      </div>

      {canViewTeamAttendance ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Daily Attendance Board</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {canViewTeamAttendance ? 'Monitor who is checked in, checked out, and still working.' : 'Your attendance record for the selected date.'}
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="skeleton h-10 w-full mb-3 rounded-lg" />
              <div className="skeleton h-10 w-full mb-3 rounded-lg" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check Out</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hours</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No attendance records found for the selected date.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                              {record.employee.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{record.employee.name}</p>
                              <p className="text-xs text-slate-500 font-mono font-medium">{record.employee.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatTime(record.check_in)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatTime(record.check_out)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatHours(record.totalHours)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${record.check_out
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${record.check_out ? 'bg-slate-600' : 'bg-emerald-600'
                                }`}
                            />
                            {record.check_out ? 'Checked Out' : 'Working'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <CalendarCheck size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Selected Day</h2>
                <p className="text-sm text-slate-500 font-medium">Your attendance details for {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Check In</p>
                <p className="text-lg font-bold text-slate-900">{formatTime(currentUserRecord?.check_in ?? null)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Check Out</p>
                <p className="text-lg font-bold text-slate-900">{formatTime(currentUserRecord?.check_out ?? null)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Hours Worked</p>
                <p className="text-lg font-bold text-slate-900">{formatHours(currentUserRecord?.totalHours ?? null)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</p>
                <p className="text-lg font-bold text-slate-900">
                  {!currentUserRecord ? 'Not Checked In' : currentUserRecord.check_out ? 'Checked Out' : 'Working'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Attendance History</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Review your own check-ins and hours by date</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="skeleton h-10 w-full mb-3 rounded-lg" />
                <div className="skeleton h-10 w-full mb-3 rounded-lg" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check Out</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hours</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          No attendance records found for the selected date.
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatTime(record.check_in)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatTime(record.check_out)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatHours(record.totalHours)}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${record.check_out
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${record.check_out ? 'bg-slate-600' : 'bg-emerald-600'
                                  }`}
                              />
                              {record.check_out ? 'Checked Out' : 'Working'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

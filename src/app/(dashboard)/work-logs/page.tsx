'use client';

import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canAssignWork, canViewTeamData } from '@/lib/roles';

interface WorkLog {
  id: number;
  employee_id: string;
  project_id?: number | null;
  work_date: string;
  task: string;
  status: string;
  description: string;
  created_at: string;
  employee: { name: string; employee_id: string };
  project?: { id: number; name: string; code: string; status: string } | null;
}

interface Employee {
  employee_id: string;
  name: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
}

const workStatusOptions: SelectOption[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In Progress' },
];

export default function WorkLogsPage() {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ employee_id: '', project_id: '', work_date: new Date().toISOString().split('T')[0], task: '', status: 'in-progress', description: '' });
  const canManageTeamLogs = canViewTeamData(user?.role);
  const canAssignTeamWork = canAssignWork(user?.role);
  const employeeOptions: SelectOption[] = employees.map((emp) => ({
    value: emp.employee_id,
    label: `${emp.name} (${emp.employee_id})`,
  }));
  const projectOptions: SelectOption[] = projects.map((project) => ({
    value: String(project.id),
    label: `${project.name} (${project.code})`,
  }));

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterEmployee) params.set('employee_id', filterEmployee);
    if (filterStatus) params.set('status', filterStatus);
    if (filterProject) params.set('project_id', filterProject);
    try {
      const res = await apiFetch(`/api/work-logs?${params}`);
      if (res.ok) { const data = await res.json(); setWorkLogs(data.workLogs); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filterDate, filterEmployee, filterStatus, filterProject]);

  const fetchEmployees = useCallback(async () => {
    if (!canManageTeamLogs) return;
    try {
      const res = await apiFetch('/api/employees');
      if (res.ok) { const data = await res.json(); setEmployees(data.employees); }
    } catch (err) { console.error(err); }
  }, [canManageTeamLogs]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch('/api/projects?status=active');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openAdd = () => {
    setEditingLog(null);
    setError('');
    setFormData({ employee_id: canAssignTeamWork ? '' : (user?.employee_id || ''), project_id: '', work_date: filterDate || new Date().toISOString().split('T')[0], task: '', status: 'in-progress', description: '' });
    setShowModal(true);
  };

  const openEdit = (log: WorkLog) => {
    setEditingLog(log);
    setError('');
    setFormData({ employee_id: log.employee_id, project_id: log.project_id ? String(log.project_id) : '', work_date: log.work_date?.split('T')[0] || '', task: log.task || '', status: log.status || 'in-progress', description: log.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const url = editingLog ? `/api/work-logs/${editingLog.id}` : '/api/work-logs';
      const method = editingLog ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save work log');
      }
      setShowModal(false);
      fetchLogs();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save work log');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this work log?')) return;
    await apiFetch(`/api/work-logs/${id}`, { method: 'DELETE' }); fetchLogs();
  };

  const toggleStatus = async (log: WorkLog) => {
    const newStatus = log.status === 'completed' ? 'in-progress' : 'completed';
    await apiFetch(`/api/work-logs/${log.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    fetchLogs();
  };

  if (loading) return <div><div className="skeleton h-8 w-48 mb-6" /><div className="skeleton h-96 rounded-2xl" /></div>;

  let buttonText = 'Log Work';
  if (saving) {
    buttonText = 'Saving...';
  } else if (editingLog) {
    buttonText = 'Update';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-slate-900 mb-1">Work Tracker</h1><p className="text-slate-500 text-sm font-medium">Daily task management and tracking</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors">
          <Plus size={18} /> Log Work
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label htmlFor="filter-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date</label>
          <input id="filter-date" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="text-sm py-2" />
        </div>
        {canManageTeamLogs && (
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label htmlFor="filter-employee" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Employee</label>
            <AppSelect
              inputId="filter-employee"
              options={employeeOptions}
              value={employeeOptions.find((option) => option.value === filterEmployee) ?? null}
              onChange={(option) => setFilterEmployee((option as SelectOption | null)?.value ?? '')}
              placeholder="All Employees"
              isClearable
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label htmlFor="filter-status" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
          <AppSelect
            inputId="filter-status"
            options={workStatusOptions}
            value={workStatusOptions.find((option) => option.value === filterStatus) ?? null}
            onChange={(option) => setFilterStatus((option as SelectOption | null)?.value ?? '')}
            placeholder="All Status"
            isClearable
          />
        </div>
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label htmlFor="filter-project" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Project</label>
          <AppSelect
            inputId="filter-project"
            options={projectOptions}
            value={projectOptions.find((option) => option.value === filterProject) ?? null}
            onChange={(option) => setFilterProject((option as SelectOption | null)?.value ?? '')}
            placeholder="All Projects"
            isClearable
          />
        </div>
        <div className="self-end pb-0.5">
          <button onClick={() => { setFilterDate(''); setFilterEmployee(''); setFilterStatus(''); setFilterProject(''); }} className="px-6 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
            <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task</th>
            <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
            <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
            <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
             {workLogs.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No work logs found for the selected filters</td></tr> : workLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                {(() => {
                  const canEditLog = canAssignTeamWork || log.employee_id === user?.employee_id;

                  return (
                    <>
                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{log.employee?.name?.charAt(0)?.toUpperCase() || '?'}</div><div><p className="text-sm font-bold text-slate-900">{log.employee?.name}</p><p className="text-xs text-slate-500 font-mono font-medium">{log.employee_id}</p></div></div></td>
                <td className="px-6 py-4"><p className="text-sm font-semibold text-slate-800">{log.task}</p>{log.description && <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">{log.description}</p>}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600">{log.project ? `${log.project.name} (${log.project.code})` : '—'}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600">{log.work_date ? new Date(log.work_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-6 py-4">
                  {canEditLog ? (
                    <button onClick={() => toggleStatus(log)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border cursor-pointer transition-colors ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}><span className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-600' : 'bg-amber-600'}`} />{log.status === 'completed' ? 'Completed' : 'In Progress'}</button>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><span className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-600' : 'bg-amber-600'}`} />{log.status === 'completed' ? 'Completed' : 'In Progress'}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {canEditLog ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(log)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(log.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">View only</span>
                  )}
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingLog ? 'Edit Work Log' : 'Log Work'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canAssignTeamWork && (
            <div><label htmlFor="log-employee" className="block text-sm font-bold text-slate-700 mb-1.5">Employee *</label>
              <AppSelect
                inputId="log-employee"
                options={employeeOptions}
                value={employeeOptions.find((option) => option.value === formData.employee_id) ?? null}
                onChange={(option) => setFormData({ ...formData, employee_id: (option as SelectOption | null)?.value ?? '' })}
                placeholder="Select employee"
              />
            </div>
          )}
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="log-date" className="block text-sm font-bold text-slate-700 mb-1.5">Date</label><input id="log-date" type="date" value={formData.work_date} onChange={(e) => setFormData({ ...formData, work_date: e.target.value })} className="w-full" /></div>
            <div><label htmlFor="log-status" className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
              <AppSelect
                inputId="log-status"
                options={workStatusOptions}
                value={workStatusOptions.find((option) => option.value === formData.status) ?? null}
                onChange={(option) => setFormData({ ...formData, status: (option as SelectOption | null)?.value ?? 'in-progress' })}
                placeholder="Select status"
              />
            </div>
          </div>
          <div><label htmlFor="log-project" className="block text-sm font-bold text-slate-700 mb-1.5">Project</label>
            <AppSelect
              inputId="log-project"
              options={projectOptions}
              value={projectOptions.find((option) => option.value === formData.project_id) ?? null}
              onChange={(option) => setFormData({ ...formData, project_id: (option as SelectOption | null)?.value ?? '' })}
              placeholder="No Project"
              isClearable
            />
          </div>
          <div><label htmlFor="log-task" className="block text-sm font-bold text-slate-700 mb-1.5">Task *</label><input id="log-task" type="text" value={formData.task} onChange={(e) => setFormData({ ...formData, task: e.target.value })} required placeholder="What was worked on..." className="w-full" /></div>
          <div><label htmlFor="log-desc" className="block text-sm font-bold text-slate-700 mb-1.5">Description</label><textarea id="log-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Additional details..." className="w-full resize-none" /></div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {buttonText}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

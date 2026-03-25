'use client';

import { Briefcase, CalendarRange, CheckCircle2, Clock3, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canManageProjects } from '@/lib/roles';

interface Project {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  assignments: {
    employee: {
      employee_id: string;
      name: string;
      role: string | null;
    };
  }[];
  _count: {
    work_logs: number;
    assignments: number;
  };
}

interface ProjectSummary {
  total: number;
  active: number;
  completed: number;
  onHold: number;
}

interface EmployeeOption {
  employee_id: string;
  name: string;
  role: string | null;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const canEditProjects = canManageProjects(user?.role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ProjectSummary>({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    employee_ids: [] as string[],
  });
  const employeeOptions: SelectOption[] = employees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.name} (${employee.employee_id})`,
  }));
  const projectStatusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
  ];

  const fetchEmployees = useCallback(async () => {
    if (!canEditProjects) return;

    try {
      const res = await apiFetch('/api/employees');
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [canEditProjects]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiFetch(`/api/projects?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load projects');
      }

      setProjects(data.projects ?? []);
      setSummary(data.summary ?? { total: 0, active: 0, completed: 0, onHold: 0 });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      employee_ids: [],
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      employee_ids: project.assignments.map((assignment) => assignment.employee.employee_id),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save project');
      }

      setShowModal(false);
      setMessage(editingProject ? 'Project updated' : 'Project created');
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project ${project.name}? Existing work logs will be detached from it.`)) return;

    try {
      const res = await apiFetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete project');
      setMessage('Project deleted');
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const statCards = [
    { label: 'Total Projects', value: summary.total, icon: Briefcase, color: 'bg-cyan-600' },
    { label: 'Active', value: summary.active, icon: Clock3, color: 'bg-emerald-600' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'bg-slate-700' },
    { label: 'On Hold', value: summary.onHold, icon: CalendarRange, color: 'bg-amber-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Projects</h1>
          <p className="text-slate-500 text-sm font-medium">Manage active initiatives and connect work logs to real projects</p>
        </div>
        {canEditProjects && (
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 shadow-sm transition-colors">
            <Plus size={18} /> Add Project
          </button>
        )}
      </div>

      {message && <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{message}</div>}
      {error && <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="relative min-w-[260px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, or description..."
            className="w-full pl-11"
          />
        </div>
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <label htmlFor="project-status" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Status</label>
          <AppSelect
            inputId="project-status"
            options={projectStatusOptions}
            value={projectStatusOptions.find((option) => option.value === statusFilter) ?? null}
            onChange={(option) => setStatusFilter((option as SelectOption | null)?.value ?? '')}
            placeholder="All Status"
            isClearable
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Members</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Work Logs</th>
              {canEditProjects && <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={canEditProjects ? 7 : 6} className="px-6 py-12 text-center text-slate-400">Loading projects...</td></tr>
            ) : projects.length === 0 ? (
              <tr><td colSpan={canEditProjects ? 7 : 6} className="px-6 py-12 text-center text-slate-400">No projects found</td></tr>
            ) : projects.map((project) => (
              <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">{project.description || 'No description added yet.'}</p>
                  </div>
                </td>
                <td className="px-6 py-4"><span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">{project.code}</span></td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN') : '—'} to {project.end_date ? new Date(project.end_date).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    project.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : project.status === 'completed'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {project.status === 'on-hold' ? 'On Hold' : project.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {project.assignments.length === 0 ? (
                    <span className="text-sm text-slate-400">No members</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {project.assignments.slice(0, 3).map((assignment) => (
                        <span key={assignment.employee.employee_id} className="px-2 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          {assignment.employee.name}
                        </span>
                      ))}
                      {project.assignments.length > 3 && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          +{project.assignments.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{project._count.work_logs}</td>
                {canEditProjects && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(project)} className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(project)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProject ? 'Edit Project' : 'Add Project'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="project-name" className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name *</label><input id="project-name" type="text" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required className="w-full" /></div>
            <div><label htmlFor="project-code" className="block text-sm font-semibold text-slate-700 mb-1.5">Project Code *</label><input id="project-code" type="text" value={formData.code} onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase() })} required className="w-full" /></div>
          </div>
          <div><label htmlFor="project-description" className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label><textarea id="project-description" rows={4} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="w-full resize-none" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label htmlFor="project-status-modal" className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
              <AppSelect
                inputId="project-status-modal"
                options={projectStatusOptions}
                value={projectStatusOptions.find((option) => option.value === formData.status) ?? null}
                onChange={(option) => setFormData({ ...formData, status: (option as SelectOption | null)?.value ?? 'active' })}
              />
            </div>
            <div><label htmlFor="project-start" className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label><input id="project-start" type="date" value={formData.start_date} onChange={(event) => setFormData({ ...formData, start_date: event.target.value })} className="w-full" /></div>
            <div><label htmlFor="project-end" className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label><input id="project-end" type="date" value={formData.end_date} onChange={(event) => setFormData({ ...formData, end_date: event.target.value })} className="w-full" /></div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned Employees</label>
            <AppSelect
              inputId="project-employees"
              options={employeeOptions}
              value={employeeOptions.filter((option) => formData.employee_ids.includes(option.value))}
              onChange={(options) =>
                setFormData((current) => ({
                  ...current,
                  employee_ids: (options as SelectOption[] | null)?.map((option) => option.value) ?? [],
                }))
              }
              placeholder="Select employees"
              isMulti
              closeMenuOnSelect={false}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm">{saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

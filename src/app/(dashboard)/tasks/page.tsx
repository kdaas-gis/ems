'use client';

import { CheckCircle2, Clock3, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canAssignWork } from '@/lib/roles';

interface EmployeeOption {
  employee_id: string;
  name: string;
}

interface ProjectOption {
  id: number;
  name: string;
  code: string;
}

interface TaskAssignment {
  id: number;
  employee_id: string;
  status: string;
  remarks: string | null;
  completed_at: string | null;
  employee: {
    employee_id: string;
    name: string;
    role: string | null;
  };
}

interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  project: {
    id: number;
    name: string;
    code: string;
    status: string;
  } | null;
  creator: {
    employee_id: string;
    name: string;
  };
  assignments: TaskAssignment[];
}

interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
}

export default function TasksPage() {
  const { user } = useAuth();
  const canManageTasks = canAssignWork(user?.role);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({ total: 0, todo: 0, inProgress: 0, completed: 0 });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    due_date: '',
    employee_ids: [] as string[],
  });
  const employeeOptions: SelectOption[] = employees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.name} (${employee.employee_id})`,
  }));
  const projectOptions: SelectOption[] = projects.map((project) => ({
    value: String(project.id),
    label: `${project.name} (${project.code})`,
  }));
  const priorityOptions: SelectOption[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/tasks');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      setTasks(data.tasks ?? []);
      setSummary(data.summary ?? { total: 0, todo: 0, inProgress: 0, completed: 0 });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!canManageTasks) return;
    const res = await apiFetch('/api/employees');
    if (!res.ok) return;
    const data = await res.json();
    setEmployees(data.employees ?? []);
  }, [canManageTasks]);

  const fetchProjects = useCallback(async () => {
    const res = await apiFetch('/api/projects?status=active');
    if (!res.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchProjects();
  }, [fetchTasks, fetchEmployees, fetchProjects]);

  const openAdd = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      project_id: '',
      priority: 'medium',
      due_date: '',
      employee_ids: [],
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      project_id: task.project ? String(task.project.id) : '',
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      employee_ids: task.assignments.map((assignment) => assignment.employee_id),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save task');
      setShowModal(false);
      setMessage(editingTask ? 'Task updated' : 'Task assigned');
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const res = await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to delete task');
      return;
    }
    setMessage('Task deleted');
    fetchTasks();
  };

  const updateMyStatus = async (taskId: number, status: 'todo' | 'in-progress' | 'completed') => {
    setError('');
    setMessage('');
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');
      setMessage(status === 'completed' ? 'Task marked complete and added to work logs' : 'Task updated');
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const statCards = [
    { label: 'Total Tasks', value: summary.total, icon: ListTodo, color: 'bg-slate-700' },
    { label: 'To Do', value: summary.todo, icon: Clock3, color: 'bg-amber-600' },
    { label: 'In Progress', value: summary.inProgress, icon: Pencil, color: 'bg-blue-600' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'bg-emerald-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Tasks</h1>
          <p className="text-slate-500 text-sm font-medium">
            {canManageTasks ? 'Assign work to employees and track completion progress' : 'Track your assigned tasks and mark them complete'}
          </p>
        </div>
        {canManageTasks && (
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors">
            <Plus size={18} /> Add Task
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">No tasks yet</div>
        ) : (
          tasks.map((task) => {
            const myAssignment = task.assignments.find((assignment) => assignment.employee_id === user?.employee_id);
            const fullyCompleted = task.assignments.length > 0 && task.assignments.every((assignment) => assignment.status === 'completed');

            return (
              <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{task.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Created by {task.creator.name}
                      {task.project ? ` • ${task.project.name} (${task.project.code})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      task.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : task.priority === 'low'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {task.priority}
                    </span>
                    {canManageTasks && (
                      <>
                        <button onClick={() => openEdit(task)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(task)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>

                {task.description && <p className="text-sm text-slate-600 mb-4">{task.description}</p>}

                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 mb-4">
                  <span>Due {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'Any time'}</span>
                  <span>{fullyCompleted ? 'All assigned employees completed this task' : 'Task in progress'}</span>
                </div>

                <div className="space-y-3">
                  {task.assignments.map((assignment) => {
                    const isSelf = assignment.employee_id === user?.employee_id;
                    return (
                      <div key={assignment.id} className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50/70">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{assignment.employee.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{assignment.employee.employee_id}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                            assignment.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : assignment.status === 'in-progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {assignment.status === 'in-progress' ? 'In Progress' : assignment.status}
                          </span>
                        </div>

                        {isSelf && !canManageTasks && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => updateMyStatus(task.id, 'in-progress')}
                              disabled={assignment.status === 'in-progress'}
                              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
                            >
                              Start Work
                            </button>
                            <button
                              onClick={() => updateMyStatus(task.id, 'completed')}
                              disabled={assignment.status === 'completed'}
                              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                            >
                              Mark Complete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {myAssignment && canManageTasks && (
                  <p className="text-xs text-slate-500 mt-4">You are also assigned to this task.</p>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title *</label>
            <input id="task-title" type="text" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} required className="w-full" />
          </div>
          <div>
            <label htmlFor="task-desc" className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea id="task-desc" rows={4} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="w-full resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-project" className="block text-sm font-semibold text-slate-700 mb-1.5">Project</label>
              <AppSelect
                inputId="task-project"
                options={projectOptions}
                value={projectOptions.find((option) => option.value === formData.project_id) ?? null}
                onChange={(option) => setFormData({ ...formData, project_id: (option as SelectOption | null)?.value ?? '' })}
                placeholder="No Project"
                isClearable
              />
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
              <AppSelect
                inputId="task-priority"
                options={priorityOptions}
                value={priorityOptions.find((option) => option.value === formData.priority) ?? null}
                onChange={(option) => setFormData({ ...formData, priority: (option as SelectOption | null)?.value ?? 'medium' })}
              />
            </div>
            <div>
              <label htmlFor="task-due" className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input id="task-due" type="date" value={formData.due_date} onChange={(event) => setFormData({ ...formData, due_date: event.target.value })} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Employees *</label>
            <AppSelect
              inputId="task-employees"
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
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

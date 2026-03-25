'use client';

import { apiFetch } from '@/lib/apiFetch';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canViewTeamData, isAdmin } from '@/lib/roles';

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  employee_code: string | null;
  dob: string | null;
  blood_type: string | null;
  designation: string | null;
  contact_num: string | null;
  email: string | null;
  role: string | null;
}

interface EmployeeDetails extends Employee {
  work_status: {
    id: number;
    work_date: string | null;
    task: string | null;
    status: string | null;
    description: string | null;
  }[];
}

const roleOptions: SelectOption[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'teamlead', label: 'Team Lead' },
  { value: 'admin', label: 'Admin' },
];

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    employee_code: '',
    dob: '',
    blood_type: '',
    designation: '',
    contact_num: '',
    email: '',
    password: 'temp123',
    role: 'employee',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isAdminUser = isAdmin(user?.role);
  const canViewEmployees = canViewTeamData(user?.role);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/employees?search=${search}`);
      if (res.ok) { const data = await res.json(); setEmployees(data.employees); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetchEmployees, 300); return () => clearTimeout(t); }, [fetchEmployees]);

  const openView = async (employeeId: string) => {
    try {
      const res = await apiFetch(`/api/employees/${employeeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load employee');
      setSelectedEmployee(data.employee);
      setShowDetailsModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    }
  };

  const openAdd = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      employee_id: '',
      employee_code: '',
      dob: '',
      blood_type: '',
      designation: '',
      contact_num: '',
      email: '',
      password: 'temp123',
      role: 'employee',
    });
    setError('');
    setShowModal(true);
  };
  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      employee_id: emp.employee_id,
      employee_code: emp.employee_code || '',
      dob: emp.dob ? emp.dob.split('T')[0] : '',
      blood_type: emp.blood_type || '',
      designation: emp.designation || '',
      contact_num: emp.contact_num || '',
      email: emp.email || '',
      password: '',
      role: emp.role || 'employee',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.employee_id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';
      const body = editingEmployee
        ? {
            name: formData.name,
            employee_code: formData.employee_code,
            dob: formData.dob,
            blood_type: formData.blood_type,
            designation: formData.designation,
            contact_num: formData.contact_num,
            email: formData.email,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {}),
          }
        : formData;
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowModal(false); fetchEmployees();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This also deletes their work logs.`)) return;
    await apiFetch(`/api/employees/${emp.employee_id}`, { method: 'DELETE' }); fetchEmployees();
  };

  if (!canViewEmployees) return null;
  if (loading) return <div><div className="skeleton h-8 w-48 mb-6" /><div className="skeleton h-96 rounded-2xl" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-slate-900 mb-1">Employees</h1><p className="text-slate-500 text-sm font-medium">{employees.length} team members</p></div>
        {isAdminUser && (
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors">
            <Plus size={18} /> Add Employee
          </button>
        )}
      </div>
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or email..." className="w-full pl-11" />
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No employees found</td></tr> : employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">{emp.name.charAt(0).toUpperCase()}</div><span className="text-sm font-semibold text-slate-900">{emp.name}</span></div></td>
                <td className="px-6 py-4"><span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">{emp.employee_id}</span></td>
                <td className="px-6 py-4 text-sm text-slate-600">{emp.employee_code || '—'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{emp.designation || '—'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{emp.contact_num || '—'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{emp.email || '—'}</td>
                <td className="px-6 py-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${emp.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : emp.role === 'teamlead' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{emp.role || 'employee'}</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openView(emp.employee_id)} className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"><Eye size={16} /></button>
                    {isAdminUser && <button onClick={() => openEdit(emp)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>}
                    {isAdminUser && <button onClick={() => handleDelete(emp)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEmployee ? 'Edit Employee' : 'Add Employee'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="emp-name" className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label><input id="emp-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full" /></div>
            <div><label htmlFor="emp-id" className="block text-sm font-semibold text-slate-700 mb-1.5">Employee ID *</label><input id="emp-id" type="text" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} required disabled={!!editingEmployee} className="w-full disabled:opacity-50" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="emp-code" className="block text-sm font-semibold text-slate-700 mb-1.5">Employee Code</label><input id="emp-code" type="text" value={formData.employee_code} onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })} className="w-full" /></div>
            <div><label htmlFor="emp-designation" className="block text-sm font-semibold text-slate-700 mb-1.5">Designation</label><input id="emp-designation" type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="emp-dob" className="block text-sm font-semibold text-slate-700 mb-1.5">DOB</label><input id="emp-dob" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full" /></div>
            <div><label htmlFor="emp-blood" className="block text-sm font-semibold text-slate-700 mb-1.5">Blood Type</label><input id="emp-blood" type="text" value={formData.blood_type} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value.toUpperCase() })} placeholder="A+, O-, AB+" className="w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="emp-contact" className="block text-sm font-semibold text-slate-700 mb-1.5">Contact</label><input id="emp-contact" type="tel" value={formData.contact_num} onChange={(e) => setFormData({ ...formData, contact_num: e.target.value })} className="w-full" /></div>
            <div><label htmlFor="emp-email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label><input id="emp-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="emp-pass" className="block text-sm font-semibold text-slate-700 mb-1.5">{editingEmployee ? 'Reset Password' : 'Temp Password'}</label><input id="emp-pass" type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingEmployee ? 'Leave empty to keep' : 'temp123'} className="w-full" /></div>
            <div><label htmlFor="emp-role" className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
              <AppSelect
                inputId="emp-role"
                options={roleOptions}
                value={roleOptions.find((option) => option.value === formData.role) ?? null}
                onChange={(option) => setFormData({ ...formData, role: (option as SelectOption | null)?.value ?? 'employee' })}
                placeholder="Select role"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? 'Saving...' : (editingEmployee ? 'Update' : 'Add Employee')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Employee Details">
        {selectedEmployee ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Name</p><p className="font-semibold text-slate-900">{selectedEmployee.name}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Employee ID</p><p className="font-semibold text-slate-900 font-mono">{selectedEmployee.employee_id}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Employee Code</p><p className="font-semibold text-slate-900">{selectedEmployee.employee_code || '—'}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Role</p><p className="font-semibold text-slate-900 capitalize">{selectedEmployee.role || 'employee'}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Designation</p><p className="font-semibold text-slate-900">{selectedEmployee.designation || '—'}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Blood Type</p><p className="font-semibold text-slate-900">{selectedEmployee.blood_type || '—'}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">DOB</p><p className="font-semibold text-slate-900">{selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString('en-IN') : '—'}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact</p><p className="font-semibold text-slate-900">{selectedEmployee.contact_num || '—'}</p></div>
              <div className="col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</p><p className="font-semibold text-slate-900">{selectedEmployee.email || '—'}</p></div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Recent Work Logs</h3>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {selectedEmployee.work_status.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-400">No work logs yet</div>
                ) : (
                  selectedEmployee.work_status.map((log) => (
                    <div key={log.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{log.task || 'Untitled task'}</p>
                        <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {log.status || 'in-progress'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{log.work_date ? new Date(log.work_date).toLocaleDateString('en-IN') : '—'}</p>
                      {log.description && <p className="text-xs text-slate-600 mt-2">{log.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No employee selected</div>
        )}
      </Modal>
    </div>
  );
}

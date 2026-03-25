'use client';

import { CalendarDays, Check, Clock, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import AppSelect, { type SelectOption } from '@/components/AppSelect';
import { canApproveLeave } from '@/lib/roles';

interface LeaveRequest {
  id: number;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  admin_comment: string | null;
  created_at: string | null;
  totalDays: number;
  employee: {
    name: string;
    employee_id: string;
  };
}

interface LeaveSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface EmployeeOption {
  employee_id: string;
  name: string;
}

const leaveTypeOptions = ['Casual', 'Sick', 'Planned', 'Emergency'];
const leaveStatusOptions: SelectOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const leaveTypeSelectOptions: SelectOption[] = leaveTypeOptions.map((option) => ({
  value: option,
  label: option,
}));

export default function LeavePage() {
  const { user } = useAuth();
  const canManageLeave = canApproveLeave(user?.role);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<LeaveSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adminCommentDraft, setAdminCommentDraft] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState({
    leave_type: 'Casual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const employeeOptions: SelectOption[] = employees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.name} (${employee.employee_id})`,
  }));

  const fetchEmployees = useCallback(async () => {
    if (!canManageLeave) return;

    try {
      const res = await apiFetch('/api/employees');
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (err) {
      console.error('Leave employee fetch error:', err);
    }
  }, [canManageLeave]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (canManageLeave && employeeFilter) params.set('employee_id', employeeFilter);

      const res = await apiFetch(`/api/leave?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load leave requests');
      }

      setRequests(data.requests ?? []);
      setSummary(data.summary ?? { total: 0, pending: 0, approved: 0, rejected: 0 });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, canManageLeave, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openAdd = () => {
    setEditingRequest(null);
    setFormData({
      leave_type: 'Casual',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      reason: '',
    });
    setError('');
    setMessage('');
    setShowModal(true);
  };

  const openEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    setFormData({
      leave_type: request.leave_type,
      start_date: request.start_date.split('T')[0],
      end_date: request.end_date.split('T')[0],
      reason: request.reason || '',
    });
    setError('');
    setMessage('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const url = editingRequest ? `/api/leave/${editingRequest.id}` : '/api/leave';
      const method = editingRequest ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save leave request');
      }

      setShowModal(false);
      setMessage(editingRequest ? 'Leave request updated' : 'Leave request submitted');
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (request: LeaveRequest) => {
    if (!confirm('Delete this leave request?')) return;

    try {
      const res = await apiFetch(`/api/leave/${request.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete leave request');
      setMessage('Leave request removed');
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete leave request');
    }
  };

  const handleAdminDecision = async (request: LeaveRequest, status: 'approved' | 'rejected') => {
    try {
      const res = await apiFetch(`/api/leave/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_comment: adminCommentDraft[request.id] || request.admin_comment || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update leave request');
      setMessage(`Leave request ${status}`);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leave request');
    }
  };

  const statCards = [
    { label: 'Total Requests', value: summary.total, color: 'bg-slate-700', icon: CalendarDays },
    { label: 'Pending', value: summary.pending, color: 'bg-amber-600', icon: Clock },
    { label: 'Approved', value: summary.approved, color: 'bg-emerald-600', icon: Check },
    { label: 'Rejected', value: summary.rejected, color: 'bg-rose-600', icon: X },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Leave Management</h1>
          <p className="text-slate-500 text-sm font-medium">
            Submit leave requests and manage approvals across the team
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 shadow-sm transition-colors"
        >
          <Plus size={18} /> Apply Leave
        </button>
      </div>

      {message && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

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
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <label htmlFor="leave-status" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
            Status
          </label>
          <AppSelect
            inputId="leave-status"
            options={leaveStatusOptions}
            value={leaveStatusOptions.find((option) => option.value === statusFilter) ?? null}
            onChange={(option) => setStatusFilter((option as SelectOption | null)?.value ?? '')}
            placeholder="All Status"
            isClearable
          />
        </div>

        {canManageLeave && (
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <label htmlFor="leave-employee" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Employee
            </label>
            <AppSelect
              inputId="leave-employee"
              options={employeeOptions}
              value={employeeOptions.find((option) => option.value === employeeFilter) ?? null}
              onChange={(option) => setEmployeeFilter((option as SelectOption | null)?.value ?? '')}
              placeholder="All Employees"
              isClearable
            />
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Leave Requests</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {canManageLeave ? 'Review pending requests and leave history.' : 'Track your submitted leave requests.'}
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
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const editableByEmployee = !canManageLeave && request.status === 'pending';

                    return (
                      <tr key={request.id} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{request.employee.name}</p>
                            <p className="text-xs text-slate-500 font-mono font-medium">{request.employee.employee_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{request.leave_type}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {new Date(request.start_date).toLocaleDateString('en-IN')} to{' '}
                          {new Date(request.end_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{request.totalDays}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                              request.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : request.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                request.status === 'approved'
                                  ? 'bg-emerald-600'
                                  : request.status === 'rejected'
                                    ? 'bg-rose-600'
                                    : 'bg-amber-600'
                              }`}
                            />
                            {request.status}
                          </span>
                          {request.admin_comment && (
                            <p className="text-xs text-slate-500 mt-2 max-w-xs">{request.admin_comment}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                          {request.reason || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {canManageLeave ? (
                            <div className="flex flex-col gap-2 items-end min-w-[220px]">
                              <textarea
                                rows={2}
                                value={adminCommentDraft[request.id] ?? request.admin_comment ?? ''}
                                onChange={(event) =>
                                  setAdminCommentDraft((current) => ({
                                    ...current,
                                    [request.id]: event.target.value,
                                  }))
                                }
                                placeholder="Admin comment"
                                className="w-full resize-none text-sm"
                              />
                              {request.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAdminDecision(request, 'approved')}
                                    className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleAdminDecision(request, 'rejected')}
                                    className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500">Decision recorded</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {editableByEmployee && (
                                <button
                                  onClick={() => openEdit(request)}
                                  className="px-3 py-2 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                              {(editableByEmployee || canManageLeave) && (
                                <button
                                  onClick={() => handleDelete(request)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRequest ? 'Edit Leave Request' : 'Apply Leave'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="leave-type" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Leave Type
              </label>
              <AppSelect
                inputId="leave-type"
                options={leaveTypeSelectOptions}
                value={leaveTypeSelectOptions.find((option) => option.value === formData.leave_type) ?? null}
                onChange={(option) => setFormData({ ...formData, leave_type: (option as SelectOption | null)?.value ?? 'Casual' })}
                placeholder="Select leave type"
              />
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Requested By</p>
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs font-mono text-slate-500">{user?.employee_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="leave-start" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                id="leave-start"
                type="date"
                value={formData.start_date}
                onChange={(event) => setFormData({ ...formData, start_date: event.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="leave-end" className="block text-sm font-semibold text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                id="leave-end"
                type="date"
                value={formData.end_date}
                onChange={(event) => setFormData({ ...formData, end_date: event.target.value })}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Reason
            </label>
            <textarea
              id="leave-reason"
              rows={4}
              value={formData.reason}
              onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
              placeholder="Add context for your leave request..."
              className="w-full resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : editingRequest ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

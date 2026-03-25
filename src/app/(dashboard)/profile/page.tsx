'use client';

import { User, Shield, Key, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isAdmin, isTeamLead } from '@/lib/roles';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    employee_code: '',
    designation: '',
    dob: '',
    blood_type: '',
    contact_num: '',
    email: '',
  });
  const adminUser = isAdmin(user?.role);
  const teamLeadUser = isTeamLead(user?.role);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      employee_code: user?.employee_code || '',
      designation: user?.designation || '',
      dob: user?.dob ? user.dob.split('T')[0] : '',
      blood_type: user?.blood_type || '',
      contact_num: user?.contact_num || '',
      email: user?.email || '',
    });
  }, [user]);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Password changed successfully!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
      else { setError(data.error || 'Failed to change password'); }
    } catch { setError('Network error'); } finally { setSaving(false); }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setProfileSaving(true);

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfileMessage(data.message || 'Profile updated successfully');
      await refreshUser();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Profile</h1>
        <p className="text-slate-500 text-sm font-medium">Manage your account settings</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <User size={40} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-slate-500 text-sm font-mono font-medium">{user?.employee_id}</p>
              <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border items-center gap-1.5 ${adminUser ? 'bg-blue-50 text-blue-700 border-blue-100' : teamLeadUser ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {adminUser || teamLeadUser ? <Shield size={12} /> : <User size={12} />}
                {user?.role}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Employee ID</span><span className="text-sm text-slate-900 font-bold font-mono">{user?.employee_id}</span></div>
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Employee Code</span><span className="text-sm text-slate-900 font-bold">{user?.employee_code || '—'}</span></div>
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Name</span><span className="text-sm text-slate-900 font-bold">{user?.name}</span></div>
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Designation</span><span className="text-sm text-slate-900 font-bold">{user?.designation || '—'}</span></div>
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">DOB</span><span className="text-sm text-slate-900 font-bold">{formatDate(user?.dob)}</span></div>
            <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Blood Type</span><span className="text-sm text-slate-900 font-bold">{user?.blood_type || '—'}</span></div>
            <div className="flex justify-between py-3"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide text-[10px]">Role</span><span className="text-sm text-slate-900 font-bold capitalize">{user?.role}</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <User size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">Edit Profile</h2>
          </div>
          {profileMessage && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">{profileMessage}</div>}
          {profileError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-bold">{profileError}</div>}
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div><label htmlFor="profile-name" className="block text-sm font-bold text-slate-700 mb-1.5">Name</label><input id="profile-name" type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required className="w-full" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="profile-code" className="block text-sm font-bold text-slate-700 mb-1.5">Employee Code</label><input id="profile-code" type="text" value={profileForm.employee_code} onChange={(e) => setProfileForm({ ...profileForm, employee_code: e.target.value })} className="w-full" /></div>
              <div><label htmlFor="profile-designation" className="block text-sm font-bold text-slate-700 mb-1.5">Designation</label><input id="profile-designation" type="text" value={profileForm.designation} onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })} className="w-full" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="profile-dob" className="block text-sm font-bold text-slate-700 mb-1.5">DOB</label><input id="profile-dob" type="date" value={profileForm.dob} onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })} className="w-full" /></div>
              <div><label htmlFor="profile-email" className="block text-sm font-bold text-slate-700 mb-1.5">Email</label><input id="profile-email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="profile-blood" className="block text-sm font-bold text-slate-700 mb-1.5">Blood Type</label><input id="profile-blood" type="text" value={profileForm.blood_type} onChange={(e) => setProfileForm({ ...profileForm, blood_type: e.target.value.toUpperCase() })} className="w-full" placeholder="A+, O-, AB+" /></div>
              <div><label htmlFor="profile-contact" className="block text-sm font-bold text-slate-700 mb-1.5">Contact</label><input id="profile-contact" type="tel" value={profileForm.contact_num} onChange={(e) => setProfileForm({ ...profileForm, contact_num: e.target.value })} className="w-full" /></div>
            </div>
            <button type="submit" disabled={profileSaving} className="w-full py-3 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2">
              {profileSaving && <Loader2 size={16} className="animate-spin" />}
              {profileSaving ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Key size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">Change Password</h2>
          </div>
          {message && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">{message}</div>}
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-bold">{error}</div>}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div><label htmlFor="current-pw" className="block text-sm font-bold text-slate-700 mb-1.5">Current Password</label><input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full" /></div>
            <div><label htmlFor="new-pw" className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label><input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full" /></div>
            <div><label htmlFor="confirm-pw" className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</label><input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full" /></div>
            <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

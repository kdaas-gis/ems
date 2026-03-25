'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessReports, canManageEmployees, canViewTeamData } from '@/lib/roles';

import { LayoutDashboard, Users, ClipboardList, CalendarCheck, Briefcase, FileText, User, LogOut, Building2, ListTodo } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users, visible: canViewTeamData },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/work-logs', label: 'Work Tracker', icon: ClipboardList },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/leave', label: 'Leave', icon: CalendarCheck }, // Using CalendarCheck as a placeholder for Leave
  { href: '/reports', label: 'Reports', icon: FileText, visible: canAccessReports },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(item => {
    return item.visible ? item.visible(user?.role) : true;
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Building2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">EMS Admin</h1>
            <p className="text-xs text-slate-400 font-medium">Employee Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon
                size={20}
                className={isActive ? 'text-white' : 'text-slate-500'}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-900/50">
          <div className="w-9 h-9 rounded bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role || 'employee'}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

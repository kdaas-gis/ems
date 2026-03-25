import { Building2, Users, ClipboardList, FileText } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">EMS Admin</span>
            <span className="text-xs text-slate-500 ml-2 font-semibold">Enterprise</span>
          </div>
        </div>
        <Link href="/login" className="px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Employee Management System
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
            Manage Your Team.
            <br />
            <span className="text-blue-600">Track Daily Progress.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
            A professional employee management platform. Track work, manage team members, generate reports, and centralize your operations — efficiently and securely.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="px-8 py-3.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">
              Get Started
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          {[
            { title: 'Employee Management', desc: 'Add, edit, and manage team members with role-based access control.', icon: Users, color: 'bg-blue-600' },
            { title: 'Daily Work Tracker', desc: 'Log daily tasks, track status, and monitor team productivity in real-time.', icon: ClipboardList, color: 'bg-slate-700' },
            { title: 'Professional Reports', desc: 'Generate and email beautiful reports to your team lead with one click.', icon: FileText, color: 'bg-blue-800' },
          ].map((feature, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-8 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center shadow-md mb-6 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-10 text-center">
        <p className="text-sm font-semibold text-slate-500">© 2026 EMS Admin — Enterprise Management System</p>
      </footer>
    </div>
  );
}

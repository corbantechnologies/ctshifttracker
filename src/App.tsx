import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Login } from './components/Login';
import { StaffDashboard } from './components/StaffDashboard';
import { HRDashboard } from './components/HRDashboard';
import { UserRole } from './types';
import { Button } from '@/components/ui/button';
import { auth } from './lib/firebase';
import { Toaster } from 'sonner';
import { LogOut, LayoutDashboard, Clock, User, ShieldCheck, Users, Calendar, BarChart3, Settings, Building2, Clock3 } from 'lucide-react';
import { cn } from './lib/utils';

function Dashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'scheduler' | 'reports' | 'overtime' | 'terminal' | 'departments' | 'timesheets'>('overview');

  if (!profile) return (
    <div className="h-screen w-screen flex items-center justify-center p-8 text-center flex-col gap-4 bg-slate-50">
      <h2 className="text-2xl font-bold text-slate-800">Profile not found</h2>
      <p className="text-slate-500 max-w-sm">
        It seems your account is not fully set up in the attendance system. 
        Please contact your HR administrator.
      </p>
      <Button onClick={() => auth.signOut()} variant="outline">Sign Out</Button>
    </div>
  );

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center w-full px-6 py-3 transition-colors text-sm font-medium",
        activeTab === id 
          ? "bg-slate-800 text-white border-r-4 border-blue-500" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="mr-3 h-4 w-4 opacity-70" />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-slate-900 h-full flex flex-col border-r border-slate-200 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ShiftFlow</span>
        </div>
        
        <div className="flex-1 py-4">
          <div className="px-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Main
          </div>
          <NavItem icon={LayoutDashboard} label="Dashboard" id="overview" />
          
          {(profile.role === UserRole.HRAdmin || (profile.role as string) === 'HR') && (
            <>
              <NavItem icon={Clock} label="Attendance Terminal" id="terminal" />
              <div className="px-6 mt-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Management
              </div>
              <NavItem icon={Users} label="Staff Directory" id="directory" />
              <NavItem icon={Clock3} label="Staff Timesheets" id="timesheets" />
              <NavItem icon={Building2} label="Departments" id="departments" />
              <NavItem icon={Calendar} label="Shift Scheduler" id="scheduler" />
              <NavItem icon={BarChart3} label="Reporting" id="reports" />
              <NavItem icon={Settings} label="Overtime Policies" id="overtime" />
            </>
          )}

          {profile.role === UserRole.Manager && (
            <>
              <NavItem icon={Clock} label="My Terminal" id="terminal" />
              <div className="px-6 mt-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Team Management
              </div>
              <NavItem icon={Users} label="Team View" id="directory" />
              <NavItem icon={Clock3} label="Team Timesheets" id="timesheets" />
              <NavItem icon={BarChart3} label="Approvals" id="reports" />
            </>
          )}

          {profile.role === UserRole.Employee && (
            <NavItem icon={Clock} label="My Terminal" id="overview" />
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-tight">
                {profile.role}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => auth.signOut()}
              className="text-slate-500 hover:text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {activeTab === 'overview' ? (profile.role === UserRole.Employee ? 'My Terminal' : 'Operational Overview') : 
               activeTab === 'directory' ? (profile.role === UserRole.HRAdmin || (profile.role as string) === 'HR' ? 'Staff Directory' : 'Team Directory') :
               activeTab === 'departments' ? 'Department Management' :
               activeTab === 'timesheets' ? 'Staff Timesheet Analysis' :
               activeTab === 'scheduler' ? 'Shift Scheduler' : 
               activeTab === 'reports' ? (profile.role === UserRole.HRAdmin || (profile.role as string) === 'HR' ? 'Operational Insights' : 'Timesheet Approvals') :
               activeTab === 'overtime' ? 'Overtime Configuration' :
               activeTab === 'terminal' ? 'Attendance Terminal' :
               'System View'}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3">
            {(profile.role === UserRole.HRAdmin || (profile.role as string) === 'HR') && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-9 shadow-sm">
                Action Center
              </Button>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="p-8">
          {(profile.role === UserRole.HRAdmin || (profile.role as string) === 'HR' || profile.role === UserRole.Manager) && activeTab !== 'terminal' ? (
            <HRDashboard initialTab={
              activeTab === 'directory' ? 'employees' : 
              activeTab === 'departments' ? 'departments' :
              activeTab === 'timesheets' ? 'timesheets' :
              activeTab === 'scheduler' ? 'shifts' : 
              activeTab === 'reports' ? 'reports' : 
              activeTab === 'overtime' ? 'overtime' :
              'live'
            } />
          ) : (
            <StaffDashboard />
          )}
        </div>
      </main>
    </div>
  );
}

function MainContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
      <Toaster position="top-right" closeButton />
    </AuthProvider>
  );
}

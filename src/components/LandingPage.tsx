import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ShieldAlert, BarChart3, Users, Calendar, ArrowRight, Activity, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Login } from './Login';
import { useAuth } from '../lib/AuthContext';

export function LandingPage() {
  const { user } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">CT Shift Tracker</span>
              <span className="block text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Corban Technologies</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Node
            </span>
            <Button 
              onClick={() => setIsLoginOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold px-5 h-10 border-none transition-all"
            >
              Access Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-16 md:py-24 relative z-10 max-w-5xl mx-auto text-center">
        {/* Organization Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-900/50 text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-8 animate-fade-in shadow-inner shadow-blue-950">
          <Activity className="h-3 w-3 animate-pulse" />
          Corban Technologies LTD • Internal System
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Internal Shift & Attendance{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
            Operations Console
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-slate-400 text-base md:text-xl max-w-2xl leading-relaxed mb-10">
          A unified, high-integrity platform to orchestrate employee schedules, log operational cycles, audit timesheets, and monitor compliance across business units.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Button 
            onClick={() => setIsLoginOpen(true)}
            className="h-14 px-8 text-sm font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-950 rounded-xl transition-all flex items-center gap-2 border-none shadow-lg shadow-white/5"
          >
            Launch Console
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#features">
            <Button 
              variant="outline"
              className="h-14 px-8 text-sm font-bold uppercase tracking-wider border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all"
            >
              Explore Capabilities
            </Button>
          </a>
        </div>

        {/* Features Preview Grid */}
        <section id="features" className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-900 text-left">
          <Card className="bg-slate-900/40 border-slate-900 hover:border-slate-800 transition-all rounded-2xl p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] rounded-full group-hover:bg-blue-600/10 transition-all"></div>
            <CardContent className="p-0 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-900/50 flex items-center justify-center text-blue-400">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Employee Terminal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Streamlined clock-in, break management, and cycle logs designed to prevent session shortcutting.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-900 hover:border-slate-800 transition-all rounded-2xl p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[50px] rounded-full group-hover:bg-indigo-600/10 transition-all"></div>
            <CardContent className="p-0 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Manager Approvals</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Granular view of team timesheets, shifts, and active sessions, complete with single-click approvals.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-900 hover:border-slate-800 transition-all rounded-2xl p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-[50px] rounded-full group-hover:bg-emerald-600/10 transition-all"></div>
            <CardContent className="p-0 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">HR Policy Control</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Define global shifts, department divisions, and automate daily overtime multipliers.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-slate-400">
              <Clock className="h-3 w-3" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">CT Shift Tracker v2.5</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500/80" />
            Internal Network Only • Authorized Operations Logged
          </div>

          <div className="text-[10px] text-slate-600">
            © 2026 Corban Technologies LTD. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-900 p-0 overflow-hidden shadow-2xl">
          <Login onCancel={() => setIsLoginOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

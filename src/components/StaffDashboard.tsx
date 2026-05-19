import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Attendance, AttendanceStatus, Shift } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, Coffee, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { cn } from '../lib/utils';

export function StaffDashboard() {
  const { user, profile } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'attendance'),
      where('employeeUid', '==', user.uid),
      orderBy('clockIn', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      setAttendance(docs);
      
      // Check if user is currently clocked in (most recent one has no clockOut)
      const active = docs.find(a => !a.clockOut);
      setCurrentAttendance(active || null);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    // Fetch shifts
    const shiftsQ = query(collection(db, 'shifts'));
    const unsubscribeShifts = onSnapshot(shiftsQ, (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    });

    return () => {
      unsubscribe();
      unsubscribeShifts();
    };
  }, [user]);

  const handleClockIn = async () => {
    if (!user) return;
    try {
      // Find suitable shift (simplification: just find the first one or let user select)
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      const newAttendance: Omit<Attendance, 'id'> = {
        employeeUid: user.uid,
        shiftId: shifts[0]?.id || 'unassigned',
        date: today,
        clockIn: now.toISOString(),
        status: AttendanceStatus.Present,
      };

      await addDoc(collection(db, 'attendance'), newAttendance);
      toast.success('Clocked in successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  const handleClockOut = async () => {
    if (!currentAttendance || !user) return;
    try {
      const now = new Date();
      const clockInTime = new Date(currentAttendance.clockIn);
      let accumulatedBreak = currentAttendance.breakMinutes || 0;
      
      // If currently on break, auto-end the break segment and add to accumulatedBreak
      if (currentAttendance.status === AttendanceStatus.OnBreak && currentAttendance.breakStart) {
        const breakStart = new Date(currentAttendance.breakStart);
        const lastBreakDuration = differenceInMinutes(now, breakStart);
        accumulatedBreak += lastBreakDuration;
      }
      
      // Deduct break minutes from total elapsed minutes
      const rawMinutes = differenceInMinutes(now, clockInTime);
      const totalMinutes = Math.max(0, rawMinutes - accumulatedBreak);
      
      // Calculate overtime if shift is known
      const shift = shifts.find(s => s.id === currentAttendance.shiftId);
      let overtime = 0;
      if (shift) {
        const [h1, m1] = shift.startTime.split(':').map(Number);
        const [h2, m2] = shift.endTime.split(':').map(Number);
        const shiftDuration = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutes > shiftDuration) {
          overtime = totalMinutes - shiftDuration;
        }
      }

      const updateData: any = {
        clockOut: now.toISOString(),
        totalMinutes,
        overtimeMinutes: overtime,
        status: AttendanceStatus.Present, // reset status back to Present on clock out
        breakMinutes: accumulatedBreak,
      };
      
      // If we auto-ended a break, clear breakStart
      if (currentAttendance.status === AttendanceStatus.OnBreak) {
        updateData.breakStart = null;
      }

      await updateDoc(doc(db, 'attendance', currentAttendance.id), updateData);
      toast.success('Clocked out successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${currentAttendance.id}`);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2 bg-white">
            <Timer className="h-4 w-4 text-blue-500" />
            Quick Action: My Shift
          </div>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <div className="text-4xl font-mono font-bold text-slate-800 mb-2 tracking-tighter">
              {format(new Date(), 'HH:mm:ss')}
            </div>
            <p className="text-xs text-slate-500 mb-8 uppercase font-semibold tracking-widest">
              {format(new Date(), 'EEEE, MMMM do')}
            </p>
            
            {currentAttendance ? (
              <div className="w-full space-y-4">
                <div className={cn(
                  "p-4 rounded-xl flex items-center justify-between text-xs font-bold uppercase tracking-wide",
                  currentAttendance.status === AttendanceStatus.OnBreak 
                    ? "bg-amber-50 text-amber-700" 
                    : "bg-emerald-50 text-emerald-700"
                )}>
                  <div className="flex items-center gap-2">
                    {currentAttendance.status === AttendanceStatus.OnBreak ? <Coffee className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    {currentAttendance.status === AttendanceStatus.OnBreak ? 'On Break' : 'Session Active'}
                  </div>
                  <span>{format(new Date(currentAttendance.clockIn), 'HH:mm')}</span>
                </div>
                
                {currentAttendance.breakMinutes || currentAttendance.status === AttendanceStatus.OnBreak ? (
                  <div className="text-center text-xs text-slate-500 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Break Duration:{' '}
                    <span className="font-bold text-slate-700">
                      {currentAttendance.breakMinutes || 0}m
                      {currentAttendance.status === AttendanceStatus.OnBreak && ' (Active)'}
                    </span>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                   <Button 
                    onClick={async () => {
                      const now = new Date().toISOString();
                      const isStartingBreak = currentAttendance.status !== AttendanceStatus.OnBreak;
                      
                      const updateData: any = {};
                      if (isStartingBreak) {
                        updateData.status = AttendanceStatus.OnBreak;
                        updateData.breakStart = now;
                      } else {
                        // Ending break
                        const breakStartStr = currentAttendance.breakStart;
                        let additionalMinutes = 0;
                        if (breakStartStr) {
                          additionalMinutes = differenceInMinutes(new Date(), new Date(breakStartStr));
                        }
                        const currentAccumulated = currentAttendance.breakMinutes || 0;
                        
                        updateData.status = AttendanceStatus.Present;
                        updateData.breakStart = null;
                        updateData.breakMinutes = currentAccumulated + additionalMinutes;
                      }
                      
                      try {
                        await updateDoc(doc(db, 'attendance', currentAttendance.id), updateData);
                        toast.success(isStartingBreak ? 'Break started' : 'Break ended');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, `attendance/${currentAttendance.id}`);
                      }
                    }}
                    variant="outline" 
                    className="h-12 border-slate-200 text-xs font-bold uppercase"
                  >
                    {currentAttendance.status === AttendanceStatus.OnBreak ? 'End Break' : 'Start Break'}
                  </Button>
                  <Button 
                    onClick={handleClockOut} 
                    className="bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all border-none h-12 uppercase"
                  >
                    Clock Out
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleClockIn} 
                className="w-full py-6 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all border-none"
              >
                <Clock className="mr-2 h-5 w-5" /> CLOCK IN
              </Button>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 border-t border-slate-100 italic uppercase font-medium tracking-wider">
            {currentAttendance ? 'Syncing active session...' : 'No active session detected'}
          </div>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly Total</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {Math.floor(attendance.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0) / 60)}h {(attendance.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0) % 60)}m
                </CardTitle>
                <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">+1.2h vs Last Month</div>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Overtime Accumulation</CardDescription>
                <CardTitle className="text-2xl font-bold text-orange-600">
                  {Math.floor(attendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0) / 60)}h {(attendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0) % 60)}m
                </CardTitle>
                <div className="mt-2 text-[10px] text-orange-500 font-bold uppercase">Pending HR Review</div>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-5">
              <CardTitle className="text-sm font-bold text-slate-800">My Attendance History</CardTitle>
              <CardDescription className="text-[10px] text-slate-500 uppercase font-semibold">Verification of your last 10 operational cycles</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clock In</TableHead>
                    <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clock Out</TableHead>
                    <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</TableHead>
                    <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {attendance.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="px-5 py-3 font-medium text-slate-900 text-xs">{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="px-5 py-3 text-slate-600 text-xs font-mono">{format(new Date(record.clockIn), 'HH:mm')}</TableCell>
                      <TableCell className="px-5 py-3 text-slate-600 text-xs font-mono">{record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}</TableCell>
                      <TableCell className="px-5 py-3 text-slate-600 text-xs">
                        {record.totalMinutes ? (
                          <div>
                            <div>{Math.floor(record.totalMinutes / 60)}h {record.totalMinutes % 60}m</div>
                            {record.breakMinutes ? (
                              <div className="text-[10px] text-slate-400 font-semibold tracking-tight">Deducted Break: {record.breakMinutes}m</div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-emerald-500 font-bold italic animate-pulse">Tracking...</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge className={cn(
                          "px-2 py-0.5 text-[9px] uppercase font-bold rounded-full",
                          record.status === AttendanceStatus.Present ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        )}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

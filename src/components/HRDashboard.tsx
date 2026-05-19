import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, where, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Employee, Shift, UserRole, Attendance, AttendanceStatus, Department } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, BarChart3, Plus, Search, UserPlus, Settings, ShieldAlert, Clock3, Building2, Trash2, Edit3, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../lib/utils';
import { OvertimePolicy } from '../types';
import { Switch } from '@/components/ui/switch';

export function HRDashboard({ initialTab = 'live' }: { initialTab?: 'employees' | 'shifts' | 'reports' | 'live' | 'overtime' | 'departments' | 'timesheets' }) {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [overtimePolicy, setOvertimePolicy] = useState<OvertimePolicy | null>(null);
  const [attendancePolicy, setAttendancePolicy] = useState({ lateGraceMinutes: 15, earlyLimitMinutes: 120 });
  const [loading, setLoading] = useState(true);

  // Form states
  const [newShift, setNewShift] = useState<Omit<Shift, 'id'>>({ name: '', startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] });
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', role: UserRole.Employee, department: '', assignedShiftId: '' });
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Timesheet Detail State
  const [timesheetEmployeeUid, setTimesheetEmployeeUid] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Employee)));
    });

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
       setAttendanceRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    });

    const unsubPolicy = onSnapshot(doc(db, 'settings', 'overtime'), (docSnap) => {
      if (docSnap.exists()) {
        setOvertimePolicy({ id: docSnap.id, ...docSnap.data() } as OvertimePolicy);
      } else {
        // Initialize default policy if none exists
        setOvertimePolicy({
          enabled: true,
          dailyThresholdMinutes: 480, // 8 hours
          multiplier: 1.5,
          requiresApproval: true,
          updatedAt: new Date().toISOString()
        });
      }
    });

    const unsubDepartments = onSnapshot(collection(db, 'departments'), (snapshot) => {
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    });

    const unsubAttendancePolicy = onSnapshot(doc(db, 'settings', 'attendance'), (docSnap) => {
      if (docSnap.exists()) {
        setAttendancePolicy(docSnap.data() as { lateGraceMinutes: number, earlyLimitMinutes: number });
      }
    });

    setLoading(false);
    return () => {
      unsubEmployees();
      unsubShifts();
      unsubAttendance();
      unsubPolicy();
      unsubDepartments();
      unsubAttendancePolicy();
    };
  }, []);

  const handleAddShift = async () => {
    try {
      await addDoc(collection(db, 'shifts'), newShift);
      toast.success('Shift added successfully');
      setNewShift({ name: '', startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] });
    } catch (error) {
      toast.error('Failed to add shift');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', id));
      toast.success('Shift deleted');
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.name) {
      toast.error('Department name is required');
      return;
    }
    try {
      await addDoc(collection(db, 'departments'), {
        ...newDepartment,
        createdAt: new Date().toISOString()
      });
      toast.success('Department created');
      setNewDepartment({ name: '', description: '' });
    } catch (error) {
      toast.error('Failed to create department');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'departments', id));
      toast.success('Department deleted');
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  const handleUpdateDepartment = async (id: string, updates: Partial<Department>) => {
    try {
      await updateDoc(doc(db, 'departments', id), updates);
      toast.success('Department updated');
    } catch (error) {
      toast.error('Failed to update department');
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email) {
      toast.error('Name and Email are required');
      return;
    }
    try {
      await addDoc(collection(db, 'employees'), {
        ...newEmployee,
        isActive: true,
        otEnabled: true,
        createdAt: new Date().toISOString()
      });
      toast.success('Personnel record created');
      setNewEmployee({ name: '', email: '', role: UserRole.Employee, department: '', assignedShiftId: '' });
      setIsAddEmployeeOpen(false);
    } catch (error) {
      toast.error('Failed to create record');
    }
  };

  // Reporting Logic
  const calculateReportData = () => {
    const data: any[] = [];
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const records = attendanceRecords.filter(r => r.date === dateStr);
      data.push({
        name: format(d, 'EEE'),
        hours: records.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0) / 60,
        overtime: records.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0) / 60,
      });
    }
    return data;
  };

  const handleUpdatePolicy = async (updates: Partial<OvertimePolicy>) => {
    try {
      await updateDoc(doc(db, 'settings', 'overtime'), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      toast.success('Overtime policy updated');
    } catch (error) {
      // If doc doesn't exist, create it
      try {
        await setDoc(doc(db, 'settings', 'overtime'), {
          enabled: true,
          dailyThresholdMinutes: 480,
          multiplier: 1.5,
          requiresApproval: true,
          ...updates,
          updatedAt: new Date().toISOString()
        });
        toast.success('Overtime policy initialized');
      } catch (e) {
        toast.error('Failed to update policy');
      }
    }
  };

  const handleUpdateAttendancePolicy = async (updates: Partial<{ lateGraceMinutes: number, earlyLimitMinutes: number }>) => {
    try {
      await setDoc(doc(db, 'settings', 'attendance'), {
        ...attendancePolicy,
        ...updates
      });
      toast.success('Attendance rules updated');
    } catch (error) {
      toast.error('Failed to update rules');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIndividualTimesheetData = () => {
    if (!timesheetEmployeeUid) return [];
    return attendanceRecords.filter(r => 
      r.employeeUid === timesheetEmployeeUid && 
      r.date >= dateFilter.start && 
      r.date <= dateFilter.end
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timesheetRecords = getIndividualTimesheetData();
  const timesheetSummary = timesheetRecords.reduce((acc, curr) => ({
    totalMinutes: acc.totalMinutes + (curr.totalMinutes || 0),
    overtimeMinutes: acc.overtimeMinutes + (curr.overtimeMinutes || 0),
    breakMinutes: acc.breakMinutes + (curr.breakMinutes || 0),
    approvedCount: acc.approvedCount + (curr.approved ? 1 : 0),
    pendingCount: acc.pendingCount + (curr.approved ? 0 : 1),
  }), { totalMinutes: 0, overtimeMinutes: 0, breakMinutes: 0, approvedCount: 0, pendingCount: 0 });

  const exportTimesheetToCSV = () => {
    const selectedEmployee = employees.find(e => e.uid === timesheetEmployeeUid);
    if (!selectedEmployee) return;

    // Headers
    const headers = [
      'Date',
      'Name',
      'Email',
      'Department',
      'Clock In',
      'Clock Out',
      'Break Minutes',
      'Regular Worked Hours',
      'Overtime Hours',
      'Status',
      'Approved Status'
    ];

    // Data rows
    const rows = timesheetRecords.map(record => {
      const regHours = record.totalMinutes ? (record.totalMinutes / 60).toFixed(2) : '0.00';
      const otHours = record.overtimeMinutes ? (record.overtimeMinutes / 60).toFixed(2) : '0.00';
      const clockInTime = record.clockIn ? format(new Date(record.clockIn), 'yyyy-MM-dd HH:mm:ss') : '';
      const clockOutTime = record.clockOut ? format(new Date(record.clockOut), 'yyyy-MM-dd HH:mm:ss') : '';
      const isApproved = record.approved ? 'Approved' : 'Pending';

      return [
        record.date,
        selectedEmployee.name,
        selectedEmployee.email,
        selectedEmployee.department,
        `"${clockInTime}"`,
        `"${clockOutTime}"`,
        record.breakMinutes || 0,
        regHours,
        otHours,
        record.status,
        isApproved
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${selectedEmployee.name.replace(/\s+/g, '_')}_${dateFilter.start}_to_${dateFilter.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Timesheet exported to CSV successfully!');
  };

  const getLiveStatus = (empUid: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const records = attendanceRecords
      .filter(r => r.employeeUid === empUid && r.date === today)
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    
    if (records.length === 0) return { status: 'Scheduled', time: '--:--', color: 'bg-slate-100 text-slate-500' };
    
    const latest = records[0];
    if (latest.clockOut) return { status: 'Clocked Out', time: format(new Date(latest.clockOut), 'HH:mm'), color: 'bg-slate-100 text-slate-400' };
    if (latest.status === AttendanceStatus.OnBreak) return { status: 'On Break', time: format(new Date(latest.clockIn), 'HH:mm'), color: 'bg-amber-100 text-amber-700' };
    return { status: 'Clocked In', time: format(new Date(latest.clockIn), 'HH:mm'), color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Tabs value={initialTab} className="w-full">
        {/* Hidden but functional for the shell nav */}
        <TabsList className="hidden">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <Card className="border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="p-5">
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Currently Working</CardDescription>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {employees.filter(e => getLiveStatus(e.uid).status === 'Clocked In').length}
                  </CardTitle>
                  <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">Active Operations</div>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="p-5">
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">On Break</CardDescription>
                   <CardTitle className="text-2xl font-bold text-slate-900">
                    {employees.filter(e => getLiveStatus(e.uid).status === 'On Break').length}
                  </CardTitle>
                  <div className="mt-2 text-[10px] text-amber-600 font-bold uppercase">Scheduled Breathers</div>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="p-5">
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Start</CardDescription>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {employees.filter(e => getLiveStatus(e.uid).status === 'Scheduled').length}
                  </CardTitle>
                  <div className="mt-2 text-[10px] text-blue-600 font-bold uppercase">Expected for Duty</div>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="p-5">
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">System Health</CardDescription>
                  <CardTitle className="text-2xl font-bold text-emerald-600 uppercase">Stable</CardTitle>
                  <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">Real-time Verified</div>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Operational Live Terminal</CardTitle>
                  <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Real-time status tracking of all registered personnel</CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 animate-pulse border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase">
                  Live Feed Active
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Status</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Sync</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Integrity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const live = getLiveStatus(emp.uid);
                      return (
                        <TableRow key={emp.uid} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                live.status === 'Clocked In' ? "bg-emerald-100 text-emerald-700" : 
                                live.status === 'On Break' ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-500"
                              )}>
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900">{emp.name}</p>
                                  {live.status === 'Clocked In' && (new Date().getHours() - new Date(attendanceRecords.find(r => r.employeeUid === emp.uid && !r.clockOut)?.clockIn || new Date()).getHours() > 8) && (
                                    <Badge className="bg-rose-100 text-rose-700 text-[8px] font-bold px-1 py-0 border-none">Long Shift</Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">{emp.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-slate-600 text-sm">{emp.department}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={cn("px-2 py-0.5 text-[9px] uppercase font-bold rounded-full border-none", live.color)}>
                              {live.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-slate-600 font-mono text-xs">{live.time}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                emp.isActive ? "bg-emerald-500" : "bg-slate-300"
                              )}></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                {emp.isActive ? 'Optimal' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white p-6">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Staff Management</CardTitle>
                <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Onboard and manage your team members</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search staff..." 
                    className="pl-9 w-64 bg-slate-50 border-slate-200 h-9 text-sm" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {(profile?.role === UserRole.HRAdmin || (profile?.role as string) === 'HR') && (
                  <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-9 shadow-sm flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Onboard New Personnel</DialogTitle>
                        <DialogDescription>
                          Register an employee by email. They will be linked automatically when they first sign in.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            placeholder="John Doe" 
                            value={newEmployee.name}
                            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Work Email</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="john@company.com" 
                            value={newEmployee.email}
                            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="role">Operational Role</Label>
                          <Select 
                            value={newEmployee.role}
                            onValueChange={(val: UserRole) => setNewEmployee({ ...newEmployee, role: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.Employee}>Employee</SelectItem>
                              <SelectItem value={UserRole.Manager}>Manager</SelectItem>
                              <SelectItem value={UserRole.HRAdmin}>HR Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dept">Department</Label>
                          <Select 
                            value={newEmployee.department}
                            onValueChange={(val: string) => setNewEmployee({ ...newEmployee, department: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map(d => (
                                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                              ))}
                              {departments.length === 0 && <SelectItem value="Unassigned" disabled>No departments configured</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="shift">Assigned Shift (Optional)</Label>
                          <Select 
                            value={newEmployee.assignedShiftId || "flexible"}
                            onValueChange={(val: string) => setNewEmployee({ ...newEmployee, assignedShiftId: val === "flexible" ? "" : val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift assignment" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flexible">Flexible / Any Shift</SelectItem>
                              {shifts.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                          onClick={handleAddEmployee}
                        >
                          Save Personnel Record
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Shift</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.uid} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-slate-900">{emp.name}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{emp.email}</TableCell>
                      <TableCell className="px-6 py-4">
                      <Badge variant={(emp.role === UserRole.HRAdmin || (emp.role as string) === 'HR') ? 'default' : 'secondary'} className={cn(
                        "px-2 py-0.5 text-[10px] uppercase font-bold",
                        (emp.role === UserRole.HRAdmin || (emp.role as string) === 'HR') ? "bg-blue-600" : (emp.role === UserRole.Manager ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")
                      )}>
                        {emp.role}
                      </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{emp.department}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">
                        {emp.assignedShiftId ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
                            {shifts.find(s => s.id === emp.assignedShiftId)?.name || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">Flexible</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">
                        {(profile?.role === UserRole.HRAdmin || (profile?.role as string) === 'HR') && (
                          <Dialog>
                            <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Employee: {emp.name}</DialogTitle>
                                <DialogDescription>Update employee role and department.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Role</Label>
                                    <Select defaultValue={emp.role} onValueChange={async (val) => {
                                      await updateDoc(doc(db, 'employees', emp.uid), { role: val });
                                      toast.success('Role updated');
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={UserRole.Employee}>Employee</SelectItem>
                                        <SelectItem value={UserRole.Manager}>Manager</SelectItem>
                                        <SelectItem value={UserRole.HRAdmin}>HR Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Department</Label>
                                  <Select 
                                    defaultValue={emp.department}
                                    onValueChange={async (val) => {
                                      await updateDoc(doc(db, 'employees', emp.uid), { department: val });
                                      toast.success('Department updated');
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {departments.map(d => (
                                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                      ))}
                                      {departments.length === 0 && <SelectItem value="Unassigned" disabled>No departments configured</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Shift Assignment</Label>
                                  <Select 
                                    defaultValue={emp.assignedShiftId || "flexible"}
                                    onValueChange={async (val) => {
                                      await updateDoc(doc(db, 'employees', emp.uid), { assignedShiftId: val === "flexible" ? "" : val });
                                      toast.success('Shift assignment updated');
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select shift assignment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="flexible">Flexible / Any Shift</SelectItem>
                                      {shifts.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label>Active Status</Label>
                                  <Button 
                                    variant={emp.isActive ? 'destructive' : 'default'}
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'employees', emp.uid), { isActive: !emp.isActive });
                                      toast.success('Status toggled');
                                    }}
                                  >
                                    {emp.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-lg font-bold">Register Department</CardTitle>
                <CardDescription className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Expand organizational structure</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department Name</Label>
                  <Input 
                    placeholder="e.g. Engineering, Sales" 
                    value={newDepartment.name} 
                    onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Descriptor (Optional)</Label>
                  <Input 
                    placeholder="Brief description..." 
                    value={newDepartment.description} 
                    onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <Button onClick={handleAddDepartment} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
                  <Building2 className="mr-2 h-4 w-4" /> Create Department
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Operational Departments</CardTitle>
                  <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Active business units and resource groups</CardDescription>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-none px-3 py-1 text-[10px] font-bold uppercase">
                  {departments.length} Units Active
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Name</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Operation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <TableRow key={dept.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          {dept.name}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-slate-600 text-sm italic">{dept.description || 'No description provided'}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Unit: {dept.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input 
                                      defaultValue={dept.name}
                                      onBlur={(e) => handleUpdateDepartment(dept.id, { name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input 
                                      defaultValue={dept.description}
                                      onBlur={(e) => handleUpdateDepartment(dept.id, { description: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteDepartment(dept.id)}
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="px-6 py-12 text-center">
                          <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-medium italic">No departments registered yet.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shifts">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Add New Shift</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Shift Name</Label>
                    <Input placeholder="Morning Shift" value={newShift.name} onChange={(e) => setNewShift({...newShift, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={newShift.startTime} onChange={(e) => setNewShift({...newShift, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" value={newShift.endTime} onChange={(e) => setNewShift({...newShift, endTime: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={handleAddShift} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Shift
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Existing Shifts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Interval</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">{shift.name}</TableCell>
                          <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteShift(shift.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="timesheets">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1 border-slate-200 shadow-sm rounded-xl h-fit">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Timesheet Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Personnel</Label>
                    <Select value={timesheetEmployeeUid} onValueChange={setTimesheetEmployeeUid}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
                          <SelectItem key={e.uid} value={e.uid}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start Date</Label>
                    <Input 
                      type="date" 
                      value={dateFilter.start} 
                      onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End Date</Label>
                    <Input 
                      type="date" 
                      value={dateFilter.end} 
                      onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                      className="bg-slate-50"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-3 space-y-6">
                {!timesheetEmployeeUid ? (
                  <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <div className="text-center">
                      <Clock3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">Select an employee to view their detailed timesheet</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <Card className="border-slate-100 shadow-none bg-slate-50/50">
                        <CardHeader className="p-4">
                          <CardDescription className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Regular Hours</CardDescription>
                          <p className="text-xl font-bold text-slate-900">{(timesheetSummary.totalMinutes / 60).toFixed(1)}h</p>
                        </CardHeader>
                      </Card>
                      <Card className="border-slate-100 shadow-none bg-slate-50/50">
                        <CardHeader className="p-4">
                          <CardDescription className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Overtime</CardDescription>
                          <p className="text-xl font-bold text-amber-600">{(timesheetSummary.overtimeMinutes / 60).toFixed(1)}h</p>
                        </CardHeader>
                      </Card>
                      <Card className="border-slate-100 shadow-none bg-slate-50/50">
                        <CardHeader className="p-4">
                          <CardDescription className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Break Time</CardDescription>
                          <p className="text-xl font-bold text-slate-700">{timesheetSummary.breakMinutes}m</p>
                        </CardHeader>
                      </Card>
                      <Card className="border-slate-100 shadow-none bg-slate-50/50">
                        <CardHeader className="p-4">
                          <CardDescription className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Approved</CardDescription>
                          <p className="text-xl font-bold text-slate-900">{timesheetSummary.approvedCount}</p>
                        </CardHeader>
                      </Card>
                      <Card className="border-slate-100 shadow-none bg-slate-50/50 col-span-2 md:col-span-1">
                        <CardHeader className="p-4">
                          <CardDescription className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pending</CardDescription>
                          <p className="text-xl font-bold text-slate-900">{timesheetSummary.pendingCount}</p>
                        </CardHeader>
                      </Card>
                    </div>

                    <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                      <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                         <div>
                           <CardTitle className="text-lg font-bold text-slate-800">
                             {employees.find(e => e.uid === timesheetEmployeeUid)?.name}'s Attendance Log
                           </CardTitle>
                           <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                             Records from {format(new Date(dateFilter.start), 'MMM dd')} to {format(new Date(dateFilter.end), 'MMM dd, yyyy')}
                           </CardDescription>
                         </div>
                         <div className="flex gap-2">
                           <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-[11px] uppercase font-bold">
                             Print
                           </Button>
                           <Button size="sm" onClick={exportTimesheetToCSV} className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg shadow-sm">
                             Export CSV
                           </Button>
                         </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Clock In</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Clock Out</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Break</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Total</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">OT</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Status</TableHead>
                              <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-right">Approval</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-100">
                             {timesheetRecords.map((record) => {
                               const isExpanded = expandedRowId === record.id;
                               const hasTasks = record.tasks && record.tasks.length > 0;
                               return (
                                 <React.Fragment key={record.id}>
                                   <TableRow 
                                     className={cn(
                                       "hover:bg-slate-50 transition-colors",
                                       hasTasks && "cursor-pointer"
                                     )}
                                     onClick={() => hasTasks && setExpandedRowId(isExpanded ? null : record.id)}
                                   >
                                     <TableCell className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                       {hasTasks && (
                                         <ChevronDown className={cn(
                                           "h-4 w-4 text-slate-400 transition-transform",
                                           isExpanded && "transform rotate-180"
                                         )} />
                                       )}
                                       {format(new Date(record.date), 'EEE, MMM dd')}
                                     </TableCell>
                                     <TableCell className="px-6 py-4 text-slate-600 font-mono text-xs">{format(new Date(record.clockIn), 'HH:mm')}</TableCell>
                                     <TableCell className="px-6 py-4 text-slate-600 font-mono text-xs">{record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}</TableCell>
                                     <TableCell className="px-6 py-4 text-slate-500 font-medium">{record.breakMinutes ? `${record.breakMinutes}m` : '-'}</TableCell>
                                     <TableCell className="px-6 py-4 text-slate-600 font-medium">{record.totalMinutes ? (record.totalMinutes / 60).toFixed(1) : '-'}h</TableCell>
                                     <TableCell className="px-6 py-4 text-amber-600 font-medium">{record.overtimeMinutes ? (record.overtimeMinutes / 60).toFixed(1) : '-'}h</TableCell>
                                     <TableCell className="px-6 py-4">
                                       <Badge className={cn(
                                         "text-[9px] uppercase font-bold border-none",
                                         record.status === AttendanceStatus.Present ? "bg-emerald-100 text-emerald-700" :
                                         record.status === AttendanceStatus.Late ? "bg-amber-100 text-amber-700" :
                                         "bg-slate-100 text-slate-500"
                                       )}>
                                         {record.status}
                                       </Badge>
                                     </TableCell>
                                     <TableCell className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                       {record.approved ? (
                                         <Badge className="bg-emerald-50 text-emerald-700 border-none">Approved</Badge>
                                       ) : (
                                         <Button 
                                           size="sm" 
                                           className="h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white"
                                           onClick={async () => {
                                             await updateDoc(doc(db, 'attendance', record.id), { approved: true });
                                             toast.success('Record approved');
                                           }}
                                         >
                                           Approve
                                         </Button>
                                       )}
                                     </TableCell>
                                   </TableRow>
                                   {isExpanded && hasTasks && (
                                     <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                       <TableCell colSpan={8} className="px-6 py-4">
                                         <div className="pl-6 border-l-2 border-blue-500 py-1 space-y-2">
                                           <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Shift Task Log:</p>
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl">
                                             {record.tasks?.map((task) => (
                                               <div key={task.id} className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                                                 <Badge className={cn(
                                                   "text-[9px] font-bold px-1.5 py-0.5 border-none uppercase",
                                                   task.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                 )}>
                                                   {task.status}
                                                 </Badge>
                                                 <span className={cn(
                                                   "font-medium text-slate-700",
                                                   task.status === 'completed' && "line-through text-slate-400"
                                                 )}>
                                                   {task.description}
                                                 </span>
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       </TableCell>
                                     </TableRow>
                                   )}
                                 </React.Fragment>
                               );
                             })}
                            {timesheetRecords.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="px-6 py-12 text-center">
                                  <p className="text-slate-400 font-medium italic">No attendance records found for this period.</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Staff</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">{employees.filter(e => e.isActive).length}</CardTitle>
                <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">System Online</div>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Records</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">{attendanceRecords.length}</CardTitle>
                <div className="mt-2 text-[10px] text-blue-600 font-bold uppercase">Synced Today</div>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Productivity</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">88.4%</CardTitle>
                <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">+2.4% Optimal</div>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="p-5 text-rose-600">
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Incidents</CardDescription>
                <CardTitle className="text-2xl font-bold">0</CardTitle>
                <div className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">All Clear</div>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 p-6">
                  <CardTitle className="text-lg font-bold text-slate-800">Organization Productivity</CardTitle>
                  <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Total worked hours vs Overtime (Last 7 days)</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] p-6">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculateReportData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar dataKey="hours" name="Regular Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="overtime" name="Overtime Hours" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden mt-6">
                <CardHeader className="bg-white border-b border-slate-100 p-6">
                   <CardTitle className="text-lg font-bold text-slate-800">Recent Attendance Stream</CardTitle>
                   <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Real-time snapshots of organizational activity</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time In</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time Out</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total (h)</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">OT (h)</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {attendanceRecords.slice(0, 10).map((record) => {
                        const emp = employees.find(e => e.uid === record.employeeUid);
                        return (
                          <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-6 py-4 font-medium text-slate-900">{emp?.name || 'Unknown'}</TableCell>
                            <TableCell className="px-6 py-4 text-slate-600">{format(new Date(record.date), 'MMM dd')}</TableCell>
                            <TableCell className="px-6 py-4 text-slate-600 font-mono text-xs">{format(new Date(record.clockIn), 'HH:mm')}</TableCell>
                            <TableCell className="px-6 py-4 text-slate-600 font-mono text-xs">{record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}</TableCell>
                            <TableCell className="px-6 py-4 text-slate-600">{record.totalMinutes ? (record.totalMinutes / 60).toFixed(1) : '-'}</TableCell>
                            <TableCell className="px-6 py-4 text-slate-600">{record.overtimeMinutes ? (record.overtimeMinutes / 60).toFixed(1) : '-'}</TableCell>
                            <TableCell className="px-6 py-4">
                              {record.approved ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-none">Approved</Badge>
                              ) : (
                                (profile?.role === UserRole.Manager || profile?.role === UserRole.HRAdmin || (profile?.role as string) === 'HR') ? (
                                  <Button 
                                    size="sm" 
                                    className="h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white"
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'attendance', record.id), { approved: true });
                                      toast.success('Record approved');
                                    }}
                                  >
                                    Approve
                                  </Button>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-400 border-none italic">Pending</Badge>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="overtime">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Global Configuration</CardTitle>
                      <CardDescription className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">System-wide rules</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8 bg-white">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-800">Tracking Engine</Label>
                      <p className="text-[10px] text-slate-500 font-medium lowercase">toggle all overtime calculations</p>
                    </div>
                    <Switch 
                      checked={overtimePolicy?.enabled ?? true} 
                      onCheckedChange={(val) => handleUpdatePolicy({ enabled: val })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Daily Threshold (Minutes)</Label>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          className="bg-slate-50 border-slate-200"
                          defaultValue={overtimePolicy?.dailyThresholdMinutes ?? 480}
                          onBlur={(e) => handleUpdatePolicy({ dailyThresholdMinutes: parseInt(e.target.value) })}
                        />
                        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{(overtimePolicy?.dailyThresholdMinutes ?? 480) / 60} hrs</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payout Multiplier</Label>
                       <Select 
                        defaultValue={(overtimePolicy?.multiplier ?? 1.5).toString()}
                        onValueChange={(val) => handleUpdatePolicy({ multiplier: parseFloat(val) })}
                       >
                         <SelectTrigger className="bg-slate-50 border-slate-200">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="1.0">1.0x (Straight Time)</SelectItem>
                           <SelectItem value="1.5">1.5x (Time and a Half)</SelectItem>
                           <SelectItem value="2.0">2.0x (Double Time)</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" /> 
                          HR Approval
                        </Label>
                        <p className="text-[10px] text-blue-600 font-medium">Require manual sign-off</p>
                      </div>
                      <Switch 
                        checked={overtimePolicy?.requiresApproval ?? true} 
                        onCheckedChange={(val) => handleUpdatePolicy({ requiresApproval: val })}
                      />
                    </div>
                  </div>
                </CardContent>
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Policy Revision: {overtimePolicy?.updatedAt ? format(new Date(overtimePolicy.updatedAt), 'MMM dd, HH:mm') : 'N/A'}</p>
                </div>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden mt-6">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <Clock3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Shift & Attendance Rules</CardTitle>
                      <CardDescription className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Lateness and Early Check-in Policies</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Late Grace Period (Minutes)</Label>
                    <Input 
                      type="number" 
                      className="bg-slate-50 border-slate-200"
                      value={attendancePolicy.lateGraceMinutes}
                      onChange={(e) => handleUpdateAttendancePolicy({ lateGraceMinutes: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-[9px] text-slate-400 italic">Minutes after shift start time before an employee is automatically marked as "Late".</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Early Clock-in Limit (Minutes)</Label>
                    <Input 
                      type="number" 
                      className="bg-slate-50 border-slate-200"
                      value={attendancePolicy.earlyLimitMinutes}
                      onChange={(e) => handleUpdateAttendancePolicy({ earlyLimitMinutes: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-[9px] text-slate-400 italic">Max minutes before shift starts during which employees are allowed to clock in.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Employee Overrides</CardTitle>
                    <CardDescription className="text-xs text-slate-500 uppercase font-semibold">Enable or disable tracking per personnel</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      placeholder="Search..." 
                      className="pl-8 h-8 text-[11px] w-48 bg-slate-50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-100 uppercase tracking-tighter">
                        <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500">Employee</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 text-center">OT Status</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500">Operation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {filteredEmployees.map((emp) => (
                        <TableRow key={emp.uid} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{emp.department}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge className={cn(
                              "px-2 py-0.5 text-[9px] uppercase font-bold rounded-full border-none",
                              emp.otEnabled !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}>
                              {emp.otEnabled !== false ? 'Eligible' : 'Exempt'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Switch 
                              checked={emp.otEnabled !== false} 
                              onCheckedChange={async (val) => {
                                try {
                                  await updateDoc(doc(db, 'employees', emp.uid), { otEnabled: val });
                                  toast.success(`OT ${val ? 'enabled' : 'disabled'} for ${emp.name}`);
                                } catch (e) {
                                  toast.error('Failed to update employee override');
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

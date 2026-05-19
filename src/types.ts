export enum UserRole {
  HRAdmin = "HR Admin",
  Manager = "Manager",
  Employee = "Employee",
}

export enum AttendanceStatus {
  Present = "Present",
  Late = "Late",
  Absent = "Absent",
  EarlyLeave = "Early Leave",
  OnBreak = "On Break",
}

export interface Employee {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  isActive: boolean;
  otEnabled: boolean;
  createdAt: string;
}

export interface OvertimePolicy {
  id?: string;
  enabled: boolean;
  dailyThresholdMinutes: number;
  multiplier: number;
  requiresApproval: boolean;
  updatedAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  description: string;
  status: 'pending' | 'completed';
  timestamp: string;
}

export interface Attendance {
  id: string;
  employeeUid: string;
  shiftId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
  totalMinutes?: number;
  overtimeMinutes?: number;
  status: AttendanceStatus;
  approved?: boolean;
  breakStart?: string; // ISO String
  breakMinutes?: number; // accumulated break duration in minutes
  tasks?: TaskItem[];
}


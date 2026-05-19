# System Overview & Architecture Guide

Welcome to the **ShiftFlow Attendance Manager** technical documentation. This guide details the system architecture, database schema, operational workflows, and backend requirements for the application.

---

## 1. System Architecture & Tech Stack
The application is built as a serverless Single Page Application (SPA):
* **Frontend**: React + Vite + TypeScript
* **Styling**: Tailwind CSS + Shadcn UI (Radix primitives)
* **Backend-as-a-Service**: Firebase
  * **Firebase Authentication**: Client-side authentication via Google OAuth (`signInWithPopup`).
  * **Cloud Firestore**: Real-time NoSQL database. No server backend is required; all read/write logic is performed client-side and governed by security rules.

---

## 2. Database Schema (Firestore Collections)

### `employees`
Stores personnel profiles.
```typescript
interface Employee {
  uid: string;              // Matches Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;           // "HR Admin" | "Manager" | "Employee"
  department: string;
  isActive: boolean;
  otEnabled: boolean;
  assignedShiftId?: string; // Omitted/empty if "Flexible"
  createdAt: string;        // ISO String
}
```

### `attendance`
Stores active and completed shifts, break intervals, and work logs.
```typescript
interface Attendance {
  id: string;
  employeeUid: string;
  shiftId: string;
  date: string;             // YYYY-MM-DD
  clockIn: string;          // ISO String
  clockOut?: string;        // ISO String
  totalMinutes?: number;    // Calculated on clock out (breaks deducted)
  overtimeMinutes?: number; // Calculated relative to shift duration
  status: AttendanceStatus; // "Present" | "Late" | "Absent" | "Early Leave" | "On Break"
  approved?: boolean;       // HR/Manager sign-off
  breakStart?: string;      // ISO String (active break time)
  breakMinutes?: number;    // Total accumulated break time in minutes
  tasks?: TaskItem[];       // Task logging list
}

interface TaskItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  timestamp: string;
}
```

### `shifts`
Company shift schedule templates.
```typescript
interface Shift {
  id: string;
  name: string;
  startTime: string;        // HH:mm (24h format)
  endTime: string;          // HH:mm (24h format)
  daysOfWeek: number[];     // Array of integers: 0 (Sunday) to 6 (Saturday)
}
```

### `settings`
Global operational policies.
* `/settings/overtime`: Handles daily thresholds, payout multipliers, and approval toggles.
* `/settings/attendance`: Handles `lateGraceMinutes` and `earlyLimitMinutes`.

---

## 3. Core Workflows & Guardrails

### A. Clock-in & Shift Matching
1. **Assigned Shift**: If an employee has a specific `assignedShiftId` set on their profile, they can only clock in for that shift.
2. **Flexible Shift (Engineers)**: If no shift is assigned, the system runs a proximity matcher (`getClosestShift`) to dynamically match the employee to the closest scheduled shift.
3. **Early Check-in Blocks**: Employees are blocked from clocking in earlier than `earlyLimitMinutes` (default: 120m) before their shift.
4. **Lateness Flag**: Clocking in later than `lateGraceMinutes` (default: 15m) automatically registers their status as `"Late"`.

### B. Shift Task Logging & Validation
* While clocked in, employees can log, complete, and delete tasks in real-time.
* **Pre-Checkout Validation**: When clocking out, the system checks for any `"pending"` tasks. If found, a validation dialog prompts the user before allowing them to check out.

### C. Break Duration Tracking
* Employees can toggle their break status (which pauses work duration tracking).
* On clock-out, any active break is finalized, and total break minutes are subtracted from `totalMinutes` to ensure accurate hour calculations.

### D. Double-Shifting Cooldown
* **Accidental Click Block**: Strict 30-minute block preventing employees from checking back in immediately after checking out.
* **Double Shift Confirmation**: If checking in again later on the same day (after 30 minutes), the system prompts for confirmation.

---

## 4. User Flow Guide (Roles & Steps)

### A. HR Admin Flow
1. **Configure Rules & Policies**: Access the *Settings / Overtime* tab. Set early clock-in limits (e.g., 60 minutes) and lateness grace periods (e.g., 15 minutes). Create/edit shift schedules (Morning, Afternoon, Night).
2. **Onboard Staff**: Go to *Staff Management*, click **Add Employee**, fill in details, and assign a specific shift (or select *Flexible / Any Shift* for flexible roles like engineers).
3. **Monitor Timesheets**: Expand attendance records using the chevron dropdowns under the *Timesheets* tab to inspect active task logs. Approve pending records and click **Export CSV** to download payroll logs.

### B. Manager Flow
1. **Monitor Operations**: View real-time active rosters (who is currently clocked in, on break, or off-duty).
2. **Review Logs**: Review employee task completion records and approve/sign off on timesheets.

### C. Employee Flow (Staff / Engineers)
1. **First-time Onboarding**: Authenticate using Google login. The app automatically links the Google account to the HR-registered profile.
2. **Clock In**: Tap **Clock In** on the dashboard. The system matches the employee to their assigned shift (or closest available shift if flexible).
3. **Log Shift Activities**: Add work items to the *Current Shift Task Log* card and check them off as they are completed.
4. **Manage Breaks**: Toggle **Start Break** / **End Break** to track breaks accurately.
5. **Clock Out**: Finish tasks, verify the checklist, and tap **Clock Out**. If tasks are left in pending, confirm the validation prompt to submit.

---

## 5. Backend & Deployment Guide

### Do I need to run a backend?
**No.** There is no dedicated backend application server to run. The business logic runs inside client-side components, secured by Firebase Security Rules.

### What needs to be deployed?
When you modify security rules (`firestore.rules`) or indices, you must deploy them to your Firebase Console so they are enforced on the database level.

Run the following commands from the workspace root:

1. **Deploy Firestore Rules**:
   ```bash
   npx firebase deploy --only firestore:rules
   ```
2. **Deploy Firestore Indexes**:
   ```bash
   npx firebase deploy --only firestore:indexes
   ```
3. **Deploy Everything**:
   ```bash
   npx firebase deploy
   ```

To run the local development server:
```bash
npm run dev
```

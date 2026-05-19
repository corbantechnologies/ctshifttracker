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

## 4. Backend & Deployment Guide

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

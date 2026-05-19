# Security Specification - ShiftFlow Attendance Manager

## Data Invariants
1. An employee record must have a unique UID matching their Firebase Auth UID.
2. Attendance records must always link to a valid employee UID.
3. Clock-out time must be after clock-in time.
4. Only HR can create or modify shift definitions.
5. Staff can only read and write their own attendance records.
6. HR can read and generate reports for all attendance records.

## The Dirty Dozen (Potential Attacks)
1. Staff user attempting to promote themselves to HR by updating their own `role` field.
2. Staff user attempting to delete a shift.
3. Staff user attempting to read another employee's attendance records.
4. Staff user attempting to clock in for another employee by spoofing `employeeUid`.
5. Staff user attempting to overwrite a completed attendance record's `clockIn` time.
6. Malicious user attempting to create an attendance record for a non-existent employee.
7. User attempting to inject a 1MB string into the `department` field (Denial of Wallet).
8. Admin spoofing: User attempting to modify the `isActive` status of another user without being HR.
9. Ghost fields: Adding a `salary` field to an employee document.
10. Orphaned writes: Creating attendance for a date in the future or past without validation.
11. State shortcutting: Clocking out without a clock-in record.
12. Resource poisoning: Using a 2KB string as a document ID.

## Access Control Matrix
| Collection | Read (Get/List) | Create | Update | Delete |
|------------|-----------------|--------|--------|--------|
| employees  | Auth (Self/All) | Auth (Self) | Self (Limited) / HR (All) | HR |
| shifts     | Auth (All)      | HR     | HR     | HR     |
| attendance | Self / HR       | Self   | Self (ClockOut) / HR | HR |

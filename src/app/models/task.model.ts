export type Priority = 'High' | 'Medium' | 'Low';
export type Category = 'School' | 'Work' | 'Personal';
export type TaskStatus = 'Pending' | 'Completed' | 'Overdue';

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
export const CATEGORIES: Category[] = ['School', 'Work', 'Personal'];

export interface Task {
  id: string;
  title: string;
  description: string;
  /** yyyy-MM-dd */
  dueDate: string;
  /** HH:mm (24 hour) */
  dueTime: string;
  priority: Priority;
  category: Category;
  completed: boolean;
  /** ISO timestamp, set when the task is marked complete */
  completedAt: string | null;
  reminder: boolean;
  /** ISO timestamp */
  createdAt: string;
}

export type TaskInput = Omit<Task, 'id' | 'completed' | 'completedAt' | 'createdAt'>;

export interface UserProfile {
  name: string;
  email: string;
}

// ---------- date helpers (all local time) ----------

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parses yyyy-MM-dd as a local date (not UTC). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** "March 20, 2025" */
export function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "9:30 AM" from "09:30" */
export function formatTime(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`;
}

/** Due moment as a Date; tasks without a time are due at the end of the day. */
export function dueMoment(t: Pick<Task, 'dueDate' | 'dueTime'>): Date {
  const d = parseIsoDate(t.dueDate);
  if (t.dueTime) {
    const [h, m] = t.dueTime.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

export function statusOf(t: Task, now = new Date()): TaskStatus {
  if (t.completed) return 'Completed';
  return dueMoment(t).getTime() < now.getTime() ? 'Overdue' : 'Pending';
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

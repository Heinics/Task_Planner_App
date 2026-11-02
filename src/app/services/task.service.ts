import { Injectable, computed, signal } from '@angular/core';
import {
  Task, TaskInput, UserProfile, addDays, dueMoment, statusOf, todayIso
} from '../models/task.model';

const STORAGE_KEY = 'taskplanner-v1';

interface Db {
  tasks: Task[];
  profile: UserProfile;
}

/** Tasks and the user profile, kept in memory as signals and saved to localStorage. */
@Injectable({ providedIn: 'root' })
export class TaskService {
  readonly tasks = signal<Task[]>([]);
  readonly profile = signal<UserProfile>({ name: 'User', email: '' });

  /** Ticks every minute so "Overdue" updates while the app stays open. */
  private readonly now = signal(new Date());

  /** All tasks sorted by due date and time. */
  readonly sorted = computed(() =>
    [...this.tasks()].sort((a, b) => dueMoment(a).getTime() - dueMoment(b).getTime()));

  readonly completedCount = computed(() => this.tasks().filter(t => t.completed).length);
  readonly overdueCount = computed(() => this.tasks().filter(t => statusOf(t, this.now()) === 'Overdue').length);
  readonly pendingCount = computed(() => this.tasks().filter(t => statusOf(t, this.now()) === 'Pending').length);

  /** Tasks due today (any status). */
  readonly todayTasks = computed(() => this.sorted().filter(t => t.dueDate === todayIso()));
  readonly todayOpen = computed(() => this.todayTasks().filter(t => !t.completed).length);
  readonly todayPercent = computed(() => {
    const list = this.todayTasks();
    if (list.length === 0) return 0;
    return Math.round((list.filter(t => t.completed).length / list.length) * 100);
  });

  constructor() {
    this.load();
    setInterval(() => this.now.set(new Date()), 60_000);
  }

  /** Status that follows the clock; use this in templates instead of calling statusOf directly. */
  status(t: Task) {
    return statusOf(t, this.now());
  }

  task(id: string): Task | undefined {
    return this.tasks().find(t => t.id === id);
  }

  tasksOn(iso: string): Task[] {
    return this.sorted().filter(t => t.dueDate === iso);
  }

  // ---------- tasks ----------
  add(data: TaskInput): Task {
    const task: Task = {
      ...data, id: this.newId(), completed: false, completedAt: null, createdAt: new Date().toISOString()
    };
    this.tasks.update(list => [...list, task]);
    this.persist();
    return task;
  }

  update(id: string, data: TaskInput): void {
    this.tasks.update(list => list.map(t => (t.id === id ? { ...t, ...data } : t)));
    this.persist();
  }

  remove(id: string): void {
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  toggle(id: string): void {
    this.tasks.update(list => list.map(t => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? new Date().toISOString() : null };
    }));
    this.persist();
  }

  // ---------- profile ----------
  saveProfile(p: UserProfile): void {
    this.profile.set({ name: p.name.trim() || 'User', email: p.email.trim() });
    this.persist();
  }

  clearAll(): void {
    this.tasks.set([]);
    this.persist();
  }

  // ---------- demo data ----------
  loadSampleData(): void {
    const today = todayIso();
    const stamp = (iso: string, hhmm: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      const [h, mi] = hhmm.split(':').map(Number);
      return new Date(y, m - 1, d, h, mi).toISOString();
    };
    const mk = (
      title: string, description: string, offset: number, dueTime: string,
      priority: Task['priority'], category: Task['category'],
      done: false | string = false
    ): Task => {
      const dueDate = addDays(today, offset);
      return {
        id: this.newId(), title, description, dueDate, dueTime, priority, category,
        completed: !!done, completedAt: done ? stamp(dueDate, done) : null,
        reminder: true, createdAt: new Date().toISOString()
      };
    };
    this.tasks.set([
      mk('Finish Capstone Documentation', 'Chapters 3 and 4', 0, '17:00', 'High', 'School'),
      mk('Review pull requests', '', 0, '10:00', 'Medium', 'Work', '09:15'),
      mk('Morning workout', '', 0, '07:00', 'Low', 'Personal', '07:40'),
      mk('Submit weekly report', '', 0, '15:00', 'Medium', 'Work'),
      mk('Buy groceries', 'Milk, eggs, rice', 0, '18:30', 'Low', 'Personal'),
      mk('Prepare presentation slides', '', 1, '09:00', 'High', 'School'),
      mk('Team meeting', '', 2, '14:00', 'Medium', 'Work'),
      mk('Pay electricity bill', '', -1, '12:00', 'High', 'Personal'),
      mk('Read research paper', '', -1, '20:00', 'Medium', 'School', '08:30'),
      mk('Update resume', '', -2, '16:00', 'Low', 'Personal', '09:05'),
      mk('Math problem set', '', -3, '09:00', 'High', 'School', '08:50'),
      mk('Client follow-up email', '', -4, '11:00', 'High', 'Work', '10:20'),
      mk('Clean the room', '', -5, '10:00', 'Low', 'Personal', '09:30'),
      mk('Lab report', '', -6, '13:00', 'Medium', 'School', '09:45')
    ]);
    this.persist();
  }

  // ---------- storage ----------
  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const db = JSON.parse(raw) as Partial<Db>;
      this.tasks.set(db.tasks ?? []);
      if (db.profile) this.profile.set(db.profile);
    } catch {
      // Corrupt or blocked storage: start empty.
    }
  }

  private persist(): void {
    try {
      const db: Db = { tasks: this.tasks(), profile: this.profile() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }

  private newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

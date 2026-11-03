import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSelect, IonSelectOption,
  IonInput, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shareOutline } from 'ionicons/icons';

import { TaskService } from '../../services/task.service';
import {
  PRIORITIES, Task, addDays, formatDate, formatTime, parseIsoDate, toIsoDate, todayIso
} from '../../models/task.model';

type Range = 'week' | 'month' | 'custom';

interface Bucket {
  label: string;
  total: number;
  completed: number;
  /** Completion rate 0-100 */
  rate: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: '#e5484d', Medium: '#ff9500', Low: '#16a34a'
};

function hourLabel(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  return formatTime(`${String(hh).padStart(2, '0')}:00`).replace(':00', '');
}

@Component({
  selector: 'app-reports',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSelect,
    IonSelectOption, IonInput
  ],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss'
})
export class ReportsPage {
  private svc = inject(TaskService);
  private toast = inject(ToastController);

  readonly range = signal<Range>('week');
  readonly customFrom = signal(addDays(todayIso(), -6));
  readonly customTo = signal(todayIso());

  /** Inclusive yyyy-MM-dd bounds of the selected range. */
  readonly bounds = computed(() => {
    const today = todayIso();
    if (this.range() === 'week') {
      const d = parseIsoDate(today);
      const monday = addDays(today, -((d.getDay() + 6) % 7));
      return { from: monday, to: addDays(monday, 6) };
    }
    if (this.range() === 'month') {
      const d = parseIsoDate(today);
      return {
        from: toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      };
    }
    const a = this.customFrom();
    const b = this.customTo();
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  });

  readonly rangeLabel = computed(() => {
    const { from, to } = this.bounds();
    return `${formatDate(from)} - ${formatDate(to)}`;
  });

  readonly inRange = computed<Task[]>(() => {
    const { from, to } = this.bounds();
    return this.svc.sorted().filter(t => t.dueDate >= from && t.dueDate <= to);
  });

  readonly total = computed(() => this.inRange().length);
  readonly completed = computed(() => this.inRange().filter(t => t.completed).length);
  readonly rate = computed(() => (this.total() ? Math.round((this.completed() / this.total()) * 100) : 0));

  /** Daily buckets for up to 14 days, weekly beyond that. */
  readonly buckets = computed<Bucket[]>(() => {
    const { from, to } = this.bounds();
    const spanDays = Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000) + 1;
    const step = spanDays <= 14 ? 1 : 7;
    const out: Bucket[] = [];
    for (let start = from, i = 1; start <= to; start = addDays(start, step), i++) {
      const end = addDays(start, step - 1);
      const list = this.inRange().filter(t => t.dueDate >= start && t.dueDate <= end);
      const done = list.filter(t => t.completed).length;
      out.push({
        label: step === 1
          ? parseIsoDate(start).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
          : `W${i}`,
        total: list.length, completed: done,
        rate: list.length ? Math.round((done / list.length) * 100) : 0
      });
    }
    return out;
  });

  readonly maxCompleted = computed(() => Math.max(1, ...this.buckets().map(b => b.completed)));

  // ---------- pie ----------
  readonly priorityStats = computed(() =>
    PRIORITIES.map(p => ({
      name: p, color: PRIORITY_COLORS[p], count: this.inRange().filter(t => t.priority === p).length
    })));

  readonly pieBackground = computed(() => {
    const total = this.total();
    if (!total) return 'var(--app-line)';
    let acc = 0;
    const stops = this.priorityStats().filter(s => s.count > 0).map(s => {
      const from = (acc / total) * 100;
      acc += s.count;
      return `${s.color} ${from}% ${(acc / total) * 100}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  // ---------- line chart (completion rate per bucket) ----------
  readonly chart = { w: 300, h: 120, padX: 14, padY: 12 };

  readonly linePoints = computed(() => {
    const b = this.buckets();
    const { w, h, padX, padY } = this.chart;
    return b.map((x, i) => ({
      x: b.length === 1 ? w / 2 : padX + (i * (w - padX * 2)) / (b.length - 1),
      y: padY + (1 - x.rate / 100) * (h - padY * 2),
      label: x.label,
      rate: x.rate
    }));
  });
  readonly linePath = computed(() => this.linePoints().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

  // ---------- insights ----------
  /** Start hour of the busiest 2-hour window of completions, or null with no data. */
  readonly bestWindow = computed<number | null>(() => {
    const hours = Array(24).fill(0);
    for (const t of this.inRange()) {
      if (t.completed && t.completedAt) hours[new Date(t.completedAt).getHours()]++;
    }
    let best = -1;
    let bestCount = 0;
    for (let h = 0; h < 24; h++) {
      const c = hours[h] + hours[(h + 1) % 24];
      if (c > bestCount) { bestCount = c; best = h; }
    }
    return best >= 0 ? best : null;
  });

  readonly insights = computed(() => {
    const h = this.bestWindow();
    if (h === null) return ['Complete a few tasks to see when you are most productive.'];
    const when = `${hourLabel(h)} and ${hourLabel(h + 2)}`;
    return [
      `You are most productive between ${when}.`,
      h < 12
        ? 'Try to complete high-priority tasks in the morning.'
        : `Try to schedule high-priority tasks between ${when}.`
    ];
  });

  constructor() {
    addIcons({ shareOutline });
  }

  setRange(v: string | null | undefined) {
    if (v === 'week' || v === 'month' || v === 'custom') this.range.set(v);
  }

  
}

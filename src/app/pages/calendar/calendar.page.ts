import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, add } from 'ionicons/icons';

import { TaskService } from '../../services/task.service';
import { formatDate, pad, todayIso } from '../../models/task.model';
import { TaskCardComponent } from '../../components/task-card/task-card.component';

interface Cell {
  iso: string;
  day: number;
  today: boolean;
  /** Has at least one task that is not overdue. */
  hasTasks: boolean;
  hasOverdue: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, TaskCardComponent],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss'
})
export class CalendarPage {
  private router = inject(Router);
  readonly svc = inject(TaskService);

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** First day of the month on show. */
  readonly month = signal(this.firstOfMonth(new Date()));
  readonly selected = signal(todayIso());

  readonly monthLabel = computed(() =>
    this.month().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  /** Leading nulls pad the first week so day 1 lands on the right weekday. */
  readonly cells = computed<(Cell | null)[]>(() => {
    const first = this.month();
    const y = first.getFullYear();
    const m = first.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const today = todayIso();
    const out: (Cell | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
      const list = this.svc.tasksOn(iso);
      const overdue = list.filter(t => this.svc.status(t) === 'Overdue').length;
      out.push({
        iso, day: d, today: iso === today,
        hasTasks: list.length - overdue > 0, hasOverdue: overdue > 0
      });
    }
    return out;
  });

  readonly selectedLabel = computed(() => formatDate(this.selected()));
  readonly selectedTasks = computed(() => this.svc.tasksOn(this.selected()));

  constructor() {
    addIcons({ chevronBack, chevronForward, add });
  }

  shift(delta: number) {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  select(iso: string) {
    this.selected.set(iso);
  }

  addOnSelected() {
    this.router.navigate(['/task/new'], { queryParams: { date: this.selected() } });
  }

  private firstOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

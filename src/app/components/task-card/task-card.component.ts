import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonCheckbox } from '@ionic/angular';

import { TaskService } from '../../services/task.service';
import { Task, formatDate, formatTime } from '../../models/task.model';

/** One task as a card: checkbox, title, due date and priority badge. Tap to edit. */
@Component({
  selector: 'app-task-card',
  imports: [IonCheckbox],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss'
})
export class TaskCardComponent {
  private router = inject(Router);
  private svc = inject(TaskService);

  readonly task = input.required<Task>();
  /** Show only the time (for lists already grouped under a date). */
  readonly timeOnly = input(false);

  readonly status = computed(() => this.svc.status(this.task()));
  readonly due = computed(() => {
    const t = this.task();
    if (this.timeOnly()) return t.dueTime ? formatTime(t.dueTime) : 'All day';
    return `Due: ${formatDate(t.dueDate)}${t.dueTime ? ', ' + formatTime(t.dueTime) : ''}`;
  });

  toggle() {
    this.svc.toggle(this.task().id);
  }

  open() {
    this.router.navigate(['/task', this.task().id]);
  }
}

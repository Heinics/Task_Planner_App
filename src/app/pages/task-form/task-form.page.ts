import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonInput,
  IonTextarea, IonToggle, IonDatetime, IonDatetimeButton,
  IonModal, AlertController, NavController, ToastController
} from '@ionic/angular';

import { TaskService } from '../../services/task.service';
import { CATEGORIES, Category, PRIORITIES, Priority, TaskInput, todayIso } from '../../models/task.model';

/** Pulls yyyy-MM-dd out of whatever string ion-datetime hands back. */
function datePart(v: string | string[] | null | undefined, fallback: string): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? fallback;
}

/** Pulls HH:mm out of "09:30" or "2025-03-20T09:30:00". */
function timePart(v: string | string[] | null | undefined, fallback: string): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.match(/(\d{2}):(\d{2})/)?.slice(1, 3).join(':') ?? fallback;
}

@Component({
  selector: 'app-task-form',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton,
    IonInput, IonTextarea, IonToggle, IonDatetime,
    IonDatetimeButton, IonModal
  ],
  templateUrl: './task-form.page.html',
  styleUrl: './task-form.page.scss'
})
export class TaskFormPage {
  private route = inject(ActivatedRoute);
  private nav = inject(NavController);
  private alert = inject(AlertController);
  private toast = inject(ToastController);
  private svc = inject(TaskService);

  readonly priorities = PRIORITIES;
  readonly categories = CATEGORIES;

  /** Empty when adding a new task. */
  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly editing = computed(() => !!this.id && !!this.svc.task(this.id));
  readonly missing = signal(false);

  form = {
    title: '',
    description: '',
    dueDate: this.route.snapshot.queryParamMap.get('date') ?? todayIso(),
    dueTime: '09:00',
    priority: 'Medium' as Priority,
    category: 'Personal' as Category,
    reminder: true
  };

  constructor() {
    if (this.id) {
      const t = this.svc.task(this.id);
      if (t) {
        this.form = {
          title: t.title, description: t.description, dueDate: t.dueDate,
          dueTime: t.dueTime || '09:00', priority: t.priority, category: t.category, reminder: t.reminder
        };
      } else {
        this.missing.set(true);
      }
    }
  }

  async save() {
    const f = this.form;
    const title = (f.title ?? '').trim();
    if (!title) {
      const t = await this.toast.create({ message: 'Please enter a task title.', duration: 2400, color: 'danger' });
      await t.present();
      return;
    }
    const data: TaskInput = {
      title,
      description: (f.description ?? '').trim(),
      dueDate: datePart(f.dueDate, todayIso()),
      dueTime: timePart(f.dueTime, '09:00'),
      priority: f.priority,
      category: f.category,
      reminder: f.reminder
    };
    if (this.editing()) this.svc.update(this.id, data);
    else this.svc.add(data);
    await this.nav.navigateBack('/tasks');
  }

  async remove() {
    const a = await this.alert.create({
      header: 'Delete task?',
      message: `"${this.form.title}" will be removed.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.svc.remove(this.id);
            this.nav.navigateBack('/tasks');
          }
        }
      ]
    });
    await a.present();
  }
}

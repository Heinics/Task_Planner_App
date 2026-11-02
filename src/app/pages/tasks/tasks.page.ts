import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonSearchbar,
  IonSegment, IonSegmentButton, IonLabel, IonFab, IonFabButton, ActionSheetController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, optionsOutline, add, clipboardOutline } from 'ionicons/icons';

import { TaskService } from '../../services/task.service';
import { PRIORITIES, Priority } from '../../models/task.model';
import { TaskCardComponent } from '../../components/task-card/task-card.component';

type Tab = 'All' | 'Pending' | 'Completed' | 'Overdue';

@Component({
  selector: 'app-tasks',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonSearchbar,
    IonSegment, IonSegmentButton, IonLabel, IonFab, IonFabButton, TaskCardComponent
  ],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss'
})
export class TasksPage {
  private router = inject(Router);
  private sheet = inject(ActionSheetController);
  readonly svc = inject(TaskService);

  readonly tabs: Tab[] = ['All', 'Pending', 'Completed', 'Overdue'];
  readonly tab = signal<Tab>('All');
  readonly query = signal('');
  readonly priority = signal<Priority | null>(null);
  readonly searching = signal(false);

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const tab = this.tab();
    const pr = this.priority();
    return this.svc.sorted().filter(t => {
      if (tab !== 'All' && this.svc.status(t) !== tab) return false;
      if (pr && t.priority !== pr) return false;
      if (q && !`${t.title} ${t.description} ${t.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  constructor() {
    addIcons({ searchOutline, optionsOutline, add, clipboardOutline });
  }

  setTab(value: string | number | undefined) {
    if (value) this.tab.set(value as Tab);
  }

  toggleSearch() {
    const on = !this.searching();
    this.searching.set(on);
    if (!on) this.query.set('');
  }

  search(value: string | null | undefined) {
    this.query.set(value ?? '');
  }

  async openFilter() {
    const s = await this.sheet.create({
      header: 'Filter by priority',
      buttons: [
        { text: 'All priorities', handler: () => this.priority.set(null) },
        ...PRIORITIES.map(p => ({ text: p, handler: () => this.priority.set(p) })),
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await s.present();
  }

  add() {
    this.router.navigate(['/task/new']);
  }
}

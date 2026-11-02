import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircleOutline, add, listOutline, checkmarkDoneOutline } from 'ionicons/icons';

import { TaskService } from '../../services/task.service';
import { greeting } from '../../models/task.model';

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-home',
  imports: [IonHeader, IonToolbar, IonContent, IonButtons, IonButton, IonIcon],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage {
  private router = inject(Router);
  readonly svc = inject(TaskService);

  readonly radius = RING_RADIUS;
  readonly ringLength = RING_LENGTH;

  readonly greeting = greeting();
  readonly name = computed(() => this.svc.profile().name);
  readonly subtitle = computed(() => {
    const n = this.svc.todayOpen();
    return n === 0 ? 'You have no open tasks today' : `You have ${n} ${n === 1 ? 'task' : 'tasks'} today`;
  });
  readonly ringOffset = computed(() => RING_LENGTH * (1 - this.svc.todayPercent() / 100));

  constructor() {
    addIcons({ personCircleOutline, add, listOutline, checkmarkDoneOutline });
  }

  addTask() {
    this.router.navigate(['/task/new']);
  }

  viewAll() {
    this.router.navigate(['/tasks']);
  }

  openProfile() {
    this.router.navigate(['/profile']);
  }

  loadSample() {
    this.svc.loadSampleData();
  }
}

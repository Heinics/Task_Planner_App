import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { syncOutline, cloudOfflineOutline } from 'ionicons/icons';

import { HealthService } from '../../services/health.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-sync',
  imports: [DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner],
  templateUrl: './sync.page.html',
  styleUrl: './sync.page.scss'
})
export class SyncPage {
  private toast = inject(ToastController);
  readonly health = inject(HealthService);
  readonly sync = inject(SyncService);

  constructor() {
    addIcons({ syncOutline, cloudOfflineOutline });
  }

  async run() {
    const res = await this.sync.syncNow();
    const t = await this.toast.create({ message: res.message, duration: 2600, color: res.ok ? 'success' : 'warning' });
    await t.present();
  }

  kindLabel(kind: string): string {
    return kind === 'record' ? 'Health record' : kind === 'family' ? 'Family' : 'Resident';
  }
}

import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  logOutOutline, homeOutline, personAddOutline, documentTextOutline, barChartOutline, pulseOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';
import { SyncService } from '../../services/sync.service';
import { FamilyFormModalComponent } from '../../components/family-form-modal/family-form-modal.component';
import { ResidentFormModalComponent } from '../../components/resident-form-modal/resident-form-modal.component';
import { HealthRecordFormModalComponent } from '../../components/health-record-form-modal/health-record-form-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage {
  private router = inject(Router);
  private modal = inject(ModalController);
  readonly auth = inject(AuthService);
  readonly health = inject(HealthService);
  readonly sync = inject(SyncService);

  readonly stats = computed(() => this.health.summary({ from: '', to: '', barangay: '' }));

  constructor() {
    addIcons({ logOutOutline, homeOutline, personAddOutline, documentTextOutline, barChartOutline, pulseOutline });
  }

  async addFamily() {
    const m = await this.modal.create({ component: FamilyFormModalComponent });
    await m.present();
  }

  async addResident() {
    const m = await this.modal.create({ component: ResidentFormModalComponent });
    await m.present();
  }

  async addRecord() {
    const m = await this.modal.create({ component: HealthRecordFormModalComponent });
    await m.present();
  }

  reports() { this.router.navigate(['/reports']); }
  goSync() { this.router.navigate(['/sync']); }
  loadSample() { return this.health.loadSampleData(); }

  async logout() {
    this.auth.logout();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }
}

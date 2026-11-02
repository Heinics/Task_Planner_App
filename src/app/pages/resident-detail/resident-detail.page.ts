import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonItemSliding, IonItemOptions, IonItemOption, AlertController,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trash, createOutline, checkmarkCircle, checkmarkDoneOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';
import { ageOf, fullName, recordSummary, todayIso, typeDef } from '../../models/chia.model';
import { ResidentFormModalComponent } from '../../components/resident-form-modal/resident-form-modal.component';
import { HealthRecordFormModalComponent } from '../../components/health-record-form-modal/health-record-form-modal.component';

@Component({
  selector: 'app-resident-detail',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonItemSliding, IonItemOptions, IonItemOption
  ],
  templateUrl: './resident-detail.page.html',
  styleUrl: './resident-detail.page.scss'
})
export class ResidentDetailPage {
  private router = inject(Router);
  private alert = inject(AlertController);
  private modal = inject(ModalController);
  readonly auth = inject(AuthService);
  readonly health = inject(HealthService);

  readonly id = signal(inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '');
  readonly fullName = fullName;
  readonly ageOf = ageOf;
  readonly typeDef = typeDef;
  readonly summary = recordSummary;

  readonly resident = computed(() => this.health.resident(this.id()));
  readonly family = computed(() => {
    const r = this.resident();
    return r ? this.health.family(r.familyId) : undefined;
  });
  readonly records = computed(() => {
    // Re-evaluate whenever records change.
    this.health.records();
    return this.health.recordsOf(this.id());
  });
  readonly referrals = computed(() => this.records().filter(r => r.type === 'referral'));

  constructor() {
    addIcons({ trash, createOutline, checkmarkCircle, checkmarkDoneOutline });
  }

  openFamily() {
    const f = this.family();
    if (f) this.router.navigate(['/family', f.id]);
  }

  async edit() {
    const m = await this.modal.create({ component: ResidentFormModalComponent, componentProps: { residentId: this.id() } });
    await m.present();
  }

  async addRecord() {
    const m = await this.modal.create({
      component: HealthRecordFormModalComponent, componentProps: { residentId: this.id() }
    });
    await m.present();
  }

  async editRecord(recordId: string) {
    const m = await this.modal.create({
      component: HealthRecordFormModalComponent, componentProps: { recordId }
    });
    await m.present();
  }

  verify(recordId: string) { return this.health.verifyRecord(recordId); }
  deleteRecord(recordId: string) { return this.health.deleteRecord(recordId); }

  async toggleDeceased() {
    const r = this.resident();
    if (!r) return;
    if (r.deceased) {
      await this.health.setDeceased(r.id, false, '');
      return;
    }
    const a = await this.alert.create({
      header: 'Mark as deceased?',
      message: `${fullName(r)} will be flagged in all reports. Enter the date of death.`,
      inputs: [{ name: 'date', type: 'date', value: todayIso(), max: todayIso() }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm', role: 'destructive',
          handler: (v: { date: string }) => {
            if (!v.date || v.date > todayIso()) return false;
            this.health.setDeceased(r.id, true, v.date);
            return true;
          }
        }
      ]
    });
    await a.present();
  }

  async remove() {
    const r = this.resident();
    if (!r) return;
    const a = await this.alert.create({
      header: 'Delete resident?',
      message: `${fullName(r)} and all their health records will be removed from this device.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.health.deleteResident(r.id);
            this.router.navigate(['/residents'], { replaceUrl: true });
          }
        }
      ]
    });
    await a.present();
  }
}

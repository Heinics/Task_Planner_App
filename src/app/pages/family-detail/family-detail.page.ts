import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, AlertController, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trash, createOutline } from 'ionicons/icons';

import { HealthService } from '../../services/health.service';
import { ageOf, fullName, initials } from '../../models/chia.model';
import { FamilyFormModalComponent } from '../../components/family-form-modal/family-form-modal.component';
import { ResidentFormModalComponent } from '../../components/resident-form-modal/resident-form-modal.component';

@Component({
  selector: 'app-family-detail',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
    IonList, IonItem, IonLabel
  ],
  templateUrl: './family-detail.page.html',
  styleUrl: './family-detail.page.scss'
})
export class FamilyDetailPage {
  private router = inject(Router);
  private alert = inject(AlertController);
  private modal = inject(ModalController);
  readonly health = inject(HealthService);

  readonly id = signal(inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '');
  readonly fullName = fullName;
  readonly initials = initials;
  readonly ageOf = ageOf;

  readonly family = computed(() => this.health.family(this.id()));
  readonly members = computed(() =>
    this.health.membersOf(this.id()).sort((a, b) =>
      (a.relation === 'Head' ? -1 : 0) - (b.relation === 'Head' ? -1 : 0)));

  constructor() {
    addIcons({ trash, createOutline });
  }

  openResident(id: string) { this.router.navigate(['/resident', id]); }

  async edit() {
    const m = await this.modal.create({ component: FamilyFormModalComponent, componentProps: { familyId: this.id() } });
    await m.present();
  }

  async addMember() {
    const m = await this.modal.create({ component: ResidentFormModalComponent, componentProps: { familyId: this.id() } });
    await m.present();
  }

  async remove() {
    const f = this.family();
    if (!f) return;
    const a = await this.alert.create({
      header: 'Delete family?',
      message: `Household ${f.householdNo}, all its members and their health records will be removed from this device.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.health.deleteFamily(f.id);
            this.router.navigate(['/families'], { replaceUrl: true });
          }
        }
      ]
    });
    await a.present();
  }
}

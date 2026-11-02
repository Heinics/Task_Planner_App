import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonFab,
  IonFabButton, IonIcon, IonSelect, IonSelectOption, ModalController
} from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, homeOutline } from 'ionicons/icons';

import { HealthService } from '../../services/health.service';
import { FamilyFormModalComponent } from '../../components/family-form-modal/family-form-modal.component';

@Component({
  selector: 'app-families',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon, IonSelect, IonSelectOption
  ],
  templateUrl: './families.page.html',
  styleUrl: './families.page.scss'
})
export class FamiliesPage {
  private router = inject(Router);
  private modal = inject(ModalController);
  readonly health = inject(HealthService);

  readonly query = signal('');
  readonly barangay = signal('');

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const b = this.barangay();
    return this.health.sortedFamilies().filter(f => {
      if (b && f.barangay !== b) return false;
      if (!q) return true;
      const names = this.health.membersOf(f.id).map(m => `${m.firstName} ${m.lastName}`).join(' ');
      return `${f.householdNo} ${f.sitio} ${f.address} ${f.philhealthNo} ${names}`.toLowerCase().includes(q);
    });
  });

  constructor() {
    addIcons({ add, homeOutline });
  }

  search(v: string | null | undefined) { this.query.set(v ?? ''); }
  open(id: string) { this.router.navigate(['/family', id]); }

  async add() {
    const m = await this.modal.create({ component: FamilyFormModalComponent });
    await m.present();
  }
}

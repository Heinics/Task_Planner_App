import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonFab,
  IonFabButton, IonIcon, IonSelect, IonSelectOption, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, peopleOutline } from 'ionicons/icons';

import { HealthService } from '../../services/health.service';
import {
  AGE_GROUPS, GENDERS, RECORD_TYPES, RecordType, ageOf, fullName, initials
} from '../../models/chia.model';
import { ResidentFormModalComponent } from '../../components/resident-form-modal/resident-form-modal.component';

@Component({
  selector: 'app-residents',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon, IonSelect, IonSelectOption
  ],
  templateUrl: './residents.page.html',
  styleUrl: './residents.page.scss'
})
export class ResidentsPage {
  private router = inject(Router);
  private modal = inject(ModalController);
  private toast = inject(ToastController);
  readonly health = inject(HealthService);

  readonly fullName = fullName;
  readonly initials = initials;
  readonly ageOf = ageOf;
  readonly ageGroups = AGE_GROUPS;
  readonly genders = GENDERS;
  readonly programs = RECORD_TYPES;

  readonly query = signal('');
  readonly barangay = signal('');
  readonly ageGroup = signal('');
  readonly gender = signal('');
  readonly program = signal('');

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const g = AGE_GROUPS.find(x => x.key === this.ageGroup()) ?? AGE_GROUPS[0];
    return this.health.sortedResidents().filter(r => {
      const fam = this.health.family(r.familyId);
      if (this.barangay() && fam?.barangay !== this.barangay()) return false;
      if (this.gender() && r.gender !== this.gender()) return false;
      const age = ageOf(r.birthDate);
      if (age < g.min || age > g.max) return false;
      if (this.program() && !this.health.hasRecordType(r.id, this.program() as RecordType)) return false;
      if (!q) return true;
      return `${fullName(r)} ${r.philhealthNo} ${fam?.address ?? ''} ${fam?.sitio ?? ''}`.toLowerCase().includes(q);
    });
  });

  readonly filtering = computed(() =>
    !!(this.barangay() || this.ageGroup() || this.gender() || this.program()));

  constructor() {
    addIcons({ add, peopleOutline });
  }

  search(v: string | null | undefined) { this.query.set(v ?? ''); }
  open(id: string) { this.router.navigate(['/resident', id]); }

  clear() {
    this.barangay.set(''); this.ageGroup.set(''); this.gender.set(''); this.program.set('');
  }

  address(familyId: string): string {
    const f = this.health.family(familyId);
    return f ? `${f.address}, ${f.barangay}` : '';
  }

  async add() {
    if (!this.health.families().length) {
      const t = await this.toast.create({ message: 'Add a family first.', duration: 2200 });
      return t.present();
    }
    const m = await this.modal.create({ component: ResidentFormModalComponent });
    return m.present();
  }
}

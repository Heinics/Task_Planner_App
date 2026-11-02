import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput, IonSelect,
  IonSelectOption, ModalController, ToastController
} from '@ionic/angular';

import { HealthService } from '../../services/health.service';
import { GENDERS, Gender, RELATIONS, todayIso } from '../../models/chia.model';

@Component({
  selector: 'app-resident-form-modal',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput,
    IonSelect, IonSelectOption
  ],
  templateUrl: './resident-form-modal.component.html',
  styleUrl: './resident-form-modal.component.scss'
})
export class ResidentFormModalComponent implements OnInit {
  private modal = inject(ModalController);
  private toast = inject(ToastController);
  readonly health = inject(HealthService);

  /** Edit an existing resident. */
  @Input() residentId = '';
  /** Pre-select the family when adding from a family page. */
  @Input() familyId = '';

  readonly genders = GENDERS;
  readonly relations = RELATIONS;
  readonly today = todayIso();

  form = {
    familyId: '', firstName: '', lastName: '', birthDate: '', gender: 'Female' as Gender,
    relation: 'Child', philhealthNo: '', contactNumber: ''
  };

  get editing(): boolean { return !!this.residentId; }
  get familyLocked(): boolean { return !!this.familyId && !this.editing; }

  ngOnInit() {
    const r = this.residentId ? this.health.resident(this.residentId) : undefined;
    if (r) {
      this.form = {
        familyId: r.familyId, firstName: r.firstName, lastName: r.lastName, birthDate: r.birthDate,
        gender: r.gender, relation: r.relation, philhealthNo: r.philhealthNo, contactNumber: r.contactNumber
      };
    } else {
      this.form.familyId = this.familyId;
      const head = this.familyId ? this.health.headOf(this.familyId) : undefined;
      if (head) this.form.lastName = head.lastName;
    }
  }

  cancel() { return this.modal.dismiss(null, 'cancel'); }

  async save() {
    const problem = this.validate();
    if (problem) {
      const t = await this.toast.create({ message: problem, duration: 2600, color: 'danger' });
      return t.present();
    }
    const f = this.form;
    const t = (v: string) => (v ?? '').trim();
    const existing = this.residentId ? this.health.resident(this.residentId) : undefined;
    const data = {
      firstName: t(f.firstName), lastName: t(f.lastName), birthDate: f.birthDate, gender: f.gender,
      relation: f.relation, philhealthNo: t(f.philhealthNo), contactNumber: t(f.contactNumber),
      deceased: existing?.deceased ?? false, dateOfDeath: existing?.dateOfDeath ?? ''
    };
    if (this.editing) {
      await this.health.updateResident(this.residentId, f.familyId, data);
      return this.modal.dismiss(this.residentId, 'saved');
    }
    const created = await this.health.addResident(f.familyId, data);
    return this.modal.dismiss(created.id, 'saved');
  }

  private validate(): string | null {
    const f = this.form;
    const has = (v: string) => !!(v ?? '').trim();
    if (!f.familyId) return 'Choose the family this resident belongs to.';
    if (!has(f.firstName) || !has(f.lastName)) return 'Enter the first and last name.';
    if (!f.birthDate) return 'Enter the date of birth.';
    if (f.birthDate > this.today) return 'Date of birth cannot be in the future.';
    return null;
  }
}

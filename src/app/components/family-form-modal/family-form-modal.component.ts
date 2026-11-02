import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput, IonSelect,
  IonSelectOption, IonIcon, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, trashOutline } from 'ionicons/icons';

import { HealthService } from '../../services/health.service';
import { AuthService } from '../../services/auth.service';
import { GENDERS, Gender, RELATIONS, ResidentInput, todayIso } from '../../models/chia.model';

interface MemberForm {
  firstName: string; lastName: string; birthDate: string; gender: Gender; relation: string;
}

@Component({
  selector: 'app-family-form-modal',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput,
    IonSelect, IonSelectOption, IonIcon
  ],
  templateUrl: './family-form-modal.component.html',
  styleUrl: './family-form-modal.component.scss'
})
export class FamilyFormModalComponent implements OnInit {
  private modal = inject(ModalController);
  private toast = inject(ToastController);
  private health = inject(HealthService);
  private auth = inject(AuthService);

  /** Set to edit an existing family; leave empty to register a new one. */
  @Input() familyId = '';

  readonly genders = GENDERS;
  readonly relations = RELATIONS.filter(r => r !== 'Head');
  readonly today = todayIso();

  form = {
    householdNo: '', barangay: '', sitio: '', address: '', contactNumber: '',
    philhealthNo: '', emergencyContact: ''
  };
  head: MemberForm = this.blankMember('Head');
  members: MemberForm[] = [];

  constructor() {
    addIcons({ addCircleOutline, trashOutline });
  }

  get editing(): boolean { return !!this.familyId; }

  ngOnInit() {
    const f = this.familyId ? this.health.family(this.familyId) : undefined;
    if (f) {
      this.form = {
        householdNo: f.householdNo, barangay: f.barangay, sitio: f.sitio, address: f.address,
        contactNumber: f.contactNumber, philhealthNo: f.philhealthNo, emergencyContact: f.emergencyContact
      };
    } else {
      this.form.householdNo = this.health.nextHouseholdNo();
      this.form.barangay = this.auth.session()?.barangay ?? '';
    }
  }

  addMember() { this.members.push(this.blankMember('Spouse')); }
  removeMember(i: number) { this.members.splice(i, 1); }
  cancel() { return this.modal.dismiss(null, 'cancel'); }

  async save() {
    const problem = this.validate();
    if (problem) {
      const t = await this.toast.create({ message: problem, duration: 2800, color: 'danger' });
      return t.present();
    }
    const t = (v: string) => (v ?? '').trim();
    const data = {
      householdNo: t(this.form.householdNo), barangay: t(this.form.barangay), sitio: t(this.form.sitio),
      address: t(this.form.address), contactNumber: t(this.form.contactNumber),
      philhealthNo: t(this.form.philhealthNo), emergencyContact: t(this.form.emergencyContact)
    };
    if (this.editing) {
      await this.health.updateFamily(this.familyId, data);
      return this.modal.dismiss(this.familyId, 'saved');
    }
    const people = [this.head, ...this.members].map(m => this.toResident(m, data.contactNumber));
    const created = await this.health.addFamily(data, people);
    return this.modal.dismiss(created.id, 'saved');
  }

  private toResident(m: MemberForm, phone: string): ResidentInput {
    return {
      firstName: m.firstName.trim(), lastName: m.lastName.trim(), birthDate: m.birthDate,
      gender: m.gender, relation: m.relation, philhealthNo: '', contactNumber: phone,
      deceased: false, dateOfDeath: ''
    };
  }

  private blankMember(relation: string): MemberForm {
    return { firstName: '', lastName: '', birthDate: '', gender: 'Female', relation };
  }

  private validate(): string | null {
    const has = (v: string) => !!(v ?? '').trim();
    const f = this.form;
    if (!has(f.householdNo)) return 'Enter the household number.';
    if (this.health.householdTaken(f.householdNo, this.familyId)) return `Household ${f.householdNo} already exists.`;
    if (!has(f.barangay)) return 'Enter the barangay.';
    if (!has(f.address)) return 'Enter the address.';
    if (!this.editing) {
      for (const m of [this.head, ...this.members]) {
        const label = m.relation === 'Head' ? 'the family head' : 'a family member';
        if (!has(m.firstName) || !has(m.lastName)) return `Enter the first and last name of ${label}.`;
        if (!m.birthDate) return `Enter the birth date of ${m.firstName}.`;
        if (m.birthDate > this.today) return `Birth date of ${m.firstName} cannot be in the future.`;
      }
    }
    return null;
  }
}

import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput, IonSelect,
  IonSelectOption, IonTextarea, ModalController, ToastController
} from '@ionic/angular';

import { HealthService } from '../../services/health.service';
import {
  FieldDef, RECORD_TYPES, RecordType, ageOf, fullName, todayIso, typeDef
} from '../../models/chia.model';

@Component({
  selector: 'app-health-record-form-modal',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonInput,
    IonSelect, IonSelectOption, IonTextarea
  ],
  templateUrl: './health-record-form-modal.component.html',
  styleUrl: './health-record-form-modal.component.scss'
})
export class HealthRecordFormModalComponent implements OnInit {
  private modal = inject(ModalController);
  private toast = inject(ToastController);
  readonly health = inject(HealthService);

  /** Edit an existing record. */
  @Input() recordId = '';
  /** Pre-select the patient (e.g. when opened from a resident page). */
  @Input() residentId = '';
  /** Pre-select the program. */
  @Input() type: RecordType = 'consultation';

  readonly types = RECORD_TYPES;
  readonly today = todayIso();
  readonly fullName = fullName;
  readonly ageOf = ageOf;

  selectedResident = '';
  date = todayIso();
  remarks = '';
  data: Record<string, string> = {};

  get editing(): boolean { return !!this.recordId; }
  get residentLocked(): boolean { return !!this.residentId; }
  get fields(): FieldDef[] { return typeDef(this.type).fields; }
  get title(): string { return `${this.editing ? 'Edit' : 'New'} ${typeDef(this.type).label} record`; }

  ngOnInit() {
    const r = this.recordId ? this.health.record(this.recordId) : undefined;
    if (r) {
      this.selectedResident = r.residentId;
      this.residentId = r.residentId;
      this.type = r.type;
      this.date = r.date;
      this.remarks = r.remarks;
      this.data = { ...r.data };
    } else {
      this.selectedResident = this.residentId;
    }
  }

  changeType(t: RecordType) {
    this.type = t;
    this.data = {};
  }

  cancel() { return this.modal.dismiss(null, 'cancel'); }

  async save() {
    const problem = this.validate();
    if (problem) {
      const t = await this.toast.create({ message: problem, duration: 2600, color: 'danger' });
      return t.present();
    }
    const clean: Record<string, string> = {};
    for (const f of this.fields) {
      const v = (this.data[f.key] ?? '').toString().trim();
      if (v) clean[f.key] = v;
    }
    const payload = { type: this.type, date: this.date, data: clean, remarks: this.remarks.trim() };
    if (this.editing) {
      await this.health.updateRecord(this.recordId, this.selectedResident, payload);
      return this.modal.dismiss(this.recordId, 'saved');
    }
    const created = await this.health.addRecord(this.selectedResident, payload);
    return this.modal.dismiss(created.id, 'saved');
  }

  private validate(): string | null {
    if (!this.selectedResident) return 'Choose the patient.';
    if (!this.date) return 'Enter the visit date.';
    if (this.date > this.today) return 'Visit date cannot be in the future.';
    return null;
  }
}

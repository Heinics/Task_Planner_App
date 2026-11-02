import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonInput, IonSelect,
  IonSelectOption, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { downloadOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';
import { fullName, typeDef } from '../../models/chia.model';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonInput, IonSelect, IonSelectOption],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss'
})
export class ReportsPage {
  private toast = inject(ToastController);
  private auth = inject(AuthService);
  readonly health = inject(HealthService);

  readonly from = signal('');
  readonly to = signal('');
  readonly barangay = signal('');

  readonly s = computed(() =>
    this.health.summary({ from: this.from(), to: this.to(), barangay: this.barangay() }));

  /** Bars for the "cases per program" chart, scaled to the largest value. */
  readonly bars = computed(() => {
    const s = this.s();
    const rows = [
      { label: 'Prenatal', value: s.prenatal },
      { label: 'Vaccinated', value: s.vaccinated },
      { label: 'TB', value: s.tb },
      { label: 'Hypertension', value: s.hypertension },
      { label: 'Diabetes', value: s.diabetes },
      { label: 'Referrals', value: s.referrals }
    ];
    const max = Math.max(1, ...rows.map(r => r.value));
    return rows.map(r => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  });

  constructor() {
    addIcons({ downloadOutline });
  }

  /**
   * Exports the filtered records as CSV, which opens in Excel.
   * (Native PDF/XLSX export is a planned next step: see README.)
   */
  async exportCsv() {
    const s = this.s();
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push('CHIA Report');
    lines.push(`Generated,${esc(new Date().toISOString())},By,${esc(this.auth.session()?.fullName ?? '')}`);
    lines.push(`Barangay,${esc(this.barangay() || 'All')},From,${esc(this.from() || '-')},To,${esc(this.to() || '-')}`);
    lines.push('');
    lines.push('Summary,Count');
    const summary: [string, number][] = [
      ['Families', s.families], ['Residents', s.residents], ['Deceased', s.deceased],
      ['Prenatal', s.prenatal], ['Vaccinated', s.vaccinated], ['TB', s.tb],
      ['Hypertension', s.hypertension], ['Diabetes', s.diabetes], ['Referrals', s.referrals],
      ['Completed TB treatment', s.completedTreatment]
    ];
    summary.forEach(([k, v]) => lines.push(`${esc(k)},${v}`));
    lines.push('');
    lines.push('Date,Resident,Program,Details,Verified');
    for (const r of [...s.records].sort((a, b) => a.date.localeCompare(b.date))) {
      const who = this.health.resident(r.residentId);
      const details = typeDef(r.type).fields
        .filter(f => r.data[f.key]).map(f => `${f.label}: ${r.data[f.key]}`).join('; ');
      lines.push([r.date, who ? fullName(who) : '', typeDef(r.type).label, details, r.verified ? 'Yes' : 'No'].map(esc).join(','));
    }
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chia-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const t = await this.toast.create({ message: 'Report exported.', duration: 1800, color: 'success' });
    await t.present();
  }
}

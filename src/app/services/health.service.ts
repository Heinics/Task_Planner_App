import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Family, FamilyInput, HealthRecord, QueueItem, RecordType, ReportFilter, Resident, ResidentInput,
  SyncKind, SyncStatus, fullName, todayIso, typeDef
} from '../models/chia.model';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'chia-data-v1';

interface Db { families: Family[]; residents: Resident[]; records: HealthRecord[]; }

export type RecordInput = Pick<HealthRecord, 'type' | 'date' | 'data' | 'remarks'>;

/**
 * All community health data, kept in memory as signals and saved to device storage on every change,
 * so it keeps working offline. Every create/edit marks the item "pending" for the sync queue.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private auth = inject(AuthService);

  readonly families = signal<Family[]>([]);
  readonly residents = signal<Resident[]>([]);
  readonly records = signal<HealthRecord[]>([]);

  readonly sortedFamilies = computed(() =>
    [...this.families()].sort((a, b) => a.householdNo.localeCompare(b.householdNo)));
  readonly sortedResidents = computed(() =>
    [...this.residents()].sort((a, b) =>
      (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName)));
  readonly barangays = computed(() =>
    [...new Set(this.families().map(f => f.barangay).filter(Boolean))].sort());

  /** Everything not yet confirmed by the server. */
  readonly queue = computed<QueueItem[]>(() => {
    const items: QueueItem[] = [];
    for (const f of this.families()) {
      if (f.sync !== 'synced') {
        items.push({ kind: 'family', id: f.id, label: `Family ${f.householdNo} · ${this.headName(f.id)}`, status: f.sync, updatedAt: f.updatedAt });
      }
    }
    for (const r of this.residents()) {
      if (r.sync !== 'synced') {
        items.push({ kind: 'resident', id: r.id, label: fullName(r), status: r.sync, updatedAt: r.updatedAt });
      }
    }
    for (const h of this.records()) {
      if (h.sync !== 'synced') {
        const who = this.resident(h.residentId);
        items.push({ kind: 'record', id: h.id, label: `${typeDef(h.type).label} · ${who ? fullName(who) : 'Unknown'}`, status: h.sync, updatedAt: h.updatedAt });
      }
    }
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  readonly syncCounts = computed(() => {
    const all = [...this.families(), ...this.residents(), ...this.records()];
    const count = (s: SyncStatus) => all.filter(x => x.sync === s).length;
    return { pending: count('pending'), failed: count('failed'), synced: count('synced') };
  });

  constructor() {
    this.load();
  }

  // ---------- lookups ----------
  family(id: string): Family | undefined { return this.families().find(f => f.id === id); }
  resident(id: string): Resident | undefined { return this.residents().find(r => r.id === id); }
  record(id: string): HealthRecord | undefined { return this.records().find(r => r.id === id); }

  membersOf(familyId: string): Resident[] {
    return this.residents().filter(r => r.familyId === familyId);
  }

  headOf(familyId: string): Resident | undefined {
    const m = this.membersOf(familyId);
    return m.find(r => r.relation === 'Head') ?? m[0];
  }

  headName(familyId: string): string {
    const h = this.headOf(familyId);
    return h ? fullName(h) : 'No head yet';
  }

  recordsOf(residentId: string): HealthRecord[] {
    return this.records().filter(r => r.residentId === residentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  lastVisit(residentId: string): string {
    return this.recordsOf(residentId)[0]?.date ?? '';
  }

  hasRecordType(residentId: string, type: RecordType): boolean {
    return this.records().some(r => r.residentId === residentId && r.type === type);
  }

  nextHouseholdNo(): string {
    return `HH-${String(this.families().length + 1).padStart(4, '0')}`;
  }

  householdTaken(no: string, exceptId = ''): boolean {
    const n = no.trim().toLowerCase();
    return this.families().some(f => f.id !== exceptId && f.householdNo.toLowerCase() === n);
  }

  // ---------- families ----------
  async addFamily(data: FamilyInput, members: ResidentInput[]): Promise<Family> {
    const family: Family = {
      ...data, id: this.newId(), createdBy: this.auth.session()?.username ?? '',
      createdAt: todayIso(), ...this.pending()
    };
    const residents = members.map(m => this.buildResident(family.id, m));
    this.families.update(l => [...l, family]);
    this.residents.update(l => [...l, ...residents]);
    this.persist();
    return family;
  }

  async updateFamily(id: string, data: FamilyInput): Promise<void> {
    this.families.update(l => l.map(f => (f.id === id ? { ...f, ...data, ...this.pending() } : f)));
    this.persist();
  }

  async deleteFamily(id: string): Promise<void> {
    const ids = new Set(this.membersOf(id).map(r => r.id));
    this.families.update(l => l.filter(f => f.id !== id));
    this.residents.update(l => l.filter(r => r.familyId !== id));
    this.records.update(l => l.filter(r => !ids.has(r.residentId)));
    this.persist();
  }

  // ---------- residents ----------
  async addResident(familyId: string, data: ResidentInput): Promise<Resident> {
    const r = this.buildResident(familyId, data);
    this.residents.update(l => [...l, r]);
    this.persist();
    return r;
  }

  async updateResident(id: string, familyId: string, data: ResidentInput): Promise<void> {
    this.residents.update(l => l.map(r => (r.id === id ? { ...r, ...data, familyId, ...this.pending() } : r)));
    this.persist();
  }

  async setDeceased(id: string, deceased: boolean, dateOfDeath: string): Promise<void> {
    this.residents.update(l => l.map(r =>
      r.id === id ? { ...r, deceased, dateOfDeath: deceased ? dateOfDeath : '', ...this.pending() } : r));
    this.persist();
  }

  async deleteResident(id: string): Promise<void> {
    this.residents.update(l => l.filter(r => r.id !== id));
    this.records.update(l => l.filter(r => r.residentId !== id));
    this.persist();
  }

  // ---------- health records ----------
  async addRecord(residentId: string, data: RecordInput): Promise<HealthRecord> {
    const rec: HealthRecord = {
      ...data, id: this.newId(), residentId, verified: false, verifiedBy: '',
      createdBy: this.auth.session()?.username ?? '', ...this.pending()
    };
    this.records.update(l => [...l, rec]);
    this.persist();
    return rec;
  }

  /** Editing a record clears its verification, because the reviewed content changed. */
  async updateRecord(id: string, residentId: string, data: RecordInput): Promise<void> {
    this.records.update(l => l.map(r =>
      r.id === id ? { ...r, ...data, residentId, verified: false, verifiedBy: '', ...this.pending() } : r));
    this.persist();
  }

  async verifyRecord(id: string): Promise<void> {
    if (!this.auth.canVerify()) return;
    const by = this.auth.session()?.fullName ?? '';
    this.records.update(l => l.map(r =>
      r.id === id ? { ...r, verified: true, verifiedBy: by, ...this.pending() } : r));
    this.persist();
  }

  async deleteRecord(id: string): Promise<void> {
    this.records.update(l => l.filter(r => r.id !== id));
    this.persist();
  }

  // ---------- reports ----------
  summary(f: ReportFilter) {
    const fams = this.families().filter(x => !f.barangay || x.barangay === f.barangay);
    const famIds = new Set(fams.map(x => x.id));
    const res = this.residents().filter(r => famIds.has(r.familyId));
    const resIds = new Set(res.map(r => r.id));
    const recs = this.records().filter(r =>
      resIds.has(r.residentId) && (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to));
    const people = (pred: (r: HealthRecord) => boolean) =>
      new Set(recs.filter(pred).map(r => r.residentId)).size;
    const chronic = (c: string) => (r: HealthRecord) =>
      r.type === 'chronic' && (r.data['condition'] === c || r.data['condition'] === 'Both');
    return {
      families: fams.length,
      residents: res.length,
      deceased: res.filter(r => r.deceased).length,
      prenatal: people(r => r.type === 'prenatal'),
      vaccinated: people(r => r.type === 'immunization'),
      tb: people(r => r.type === 'tb'),
      hypertension: people(chronic('Hypertension')),
      diabetes: people(chronic('Diabetes')),
      referrals: recs.filter(r => r.type === 'referral').length,
      completedTreatment: recs.filter(r =>
        r.type === 'tb' && ['Cured', 'Treatment completed'].includes(r.data['outcome'])).length,
      records: recs
    };
  }

  // ---------- sync ----------
  payload(kind: SyncKind, id: string): unknown {
    return kind === 'family' ? this.family(id) : kind === 'resident' ? this.resident(id) : this.record(id);
  }

  /** Apply the result of a sync run in one write. */
  applySyncResults(results: { kind: SyncKind; id: string; status: SyncStatus }[]): void {
    const pick = (kind: SyncKind) => new Map(results.filter(r => r.kind === kind).map(r => [r.id, r.status]));
    const fam = pick('family'), res = pick('resident'), rec = pick('record');
    this.families.update(l => l.map(x => (fam.has(x.id) ? { ...x, sync: fam.get(x.id)! } : x)));
    this.residents.update(l => l.map(x => (res.has(x.id) ? { ...x, sync: res.get(x.id)! } : x)));
    this.records.update(l => l.map(x => (rec.has(x.id) ? { ...x, sync: rec.get(x.id)! } : x)));
    this.persist();
  }

  // ---------- demo data ----------
  async loadSampleData(): Promise<void> {
    const user = this.auth.session()?.username ?? '';
    const base = { sync: 'pending' as SyncStatus, updatedAt: new Date().toISOString() };
    const fam = (no: number, sitio: string, address: string, phone: string, ph: string): Family => ({
      id: this.newId(), householdNo: `HH-${String(no).padStart(4, '0')}`, barangay: 'San Isidro', sitio,
      address, contactNumber: phone, philhealthNo: ph, emergencyContact: 'Rosa Cruz 0917 555 0101',
      createdBy: user, createdAt: todayIso(), ...base
    });
    const res = (f: Family, first: string, last: string, born: string, g: Resident['gender'], rel: string): Resident => ({
      id: this.newId(), familyId: f.id, firstName: first, lastName: last, birthDate: born, gender: g,
      relation: rel, philhealthNo: '', contactNumber: f.contactNumber, deceased: false, dateOfDeath: '',
      createdAt: todayIso(), ...base
    });
    const rec = (r: Resident, type: RecordType, date: string, data: Record<string, string>): HealthRecord => ({
      id: this.newId(), residentId: r.id, type, date, data, remarks: '', verified: false, verifiedBy: '',
      createdBy: user, ...base
    });

    const f1 = fam(1, 'Purok 1', '12 Mabini St.', '0917 111 2233', '01-123456789-0');
    const f2 = fam(2, 'Purok 3', '45 Rizal Ave.', '0918 222 3344', '');
    const a = res(f1, 'Elena', 'Dela Cruz', '1994-05-12', 'Female', 'Head');
    const b = res(f1, 'Ramon', 'Dela Cruz', '1991-09-30', 'Male', 'Spouse');
    const c = res(f1, 'Luis', 'Dela Cruz', todayIso(-300), 'Male', 'Child');
    const d = res(f2, 'Teodoro', 'Bautista', '1958-02-03', 'Male', 'Head');
    const e = res(f2, 'Marites', 'Bautista', '1962-11-19', 'Female', 'Spouse');

    this.families.set([f1, f2]);
    this.residents.set([a, b, c, d, e]);
    this.records.set([
      rec(a, 'prenatal', todayIso(-10), { gravida: '2', para: '1', bloodPressure: '110/70', weight: '58', urineTest: 'Normal', iron: 'Yes', nextVisit: todayIso(20) }),
      rec(c, 'immunization', todayIso(-30), { vaccine: 'Pentavalent', dose: '2nd' }),
      rec(c, 'nutrition', todayIso(-30), { weight: '8.1', height: '70', status: 'Normal' }),
      rec(d, 'chronic', todayIso(-5), { condition: 'Hypertension', bloodPressure: '150/95', medication: 'Amlodipine 5mg', adherence: 'Yes', nextVisit: todayIso(25) }),
      rec(e, 'tb', todayIso(-60), { tbType: 'Pulmonary', regimen: 'Category 1', sputum: 'Negative', outcome: 'On treatment' }),
      rec(e, 'referral', todayIso(-3), { referredTo: 'RHU', reason: 'Follow-up sputum exam', urgency: 'Routine', status: 'Pending' })
    ]);
    this.persist();
  }

  // ---------- storage ----------
  private buildResident(familyId: string, data: ResidentInput): Resident {
    return { ...data, id: this.newId(), familyId, createdAt: todayIso(), ...this.pending() };
  }

  private pending(): { sync: SyncStatus; updatedAt: string } {
    return { sync: 'pending', updatedAt: new Date().toISOString() };
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const db = JSON.parse(raw) as Partial<Db>;
      this.families.set(db.families ?? []);
      this.residents.set(db.residents ?? []);
      this.records.set(db.records ?? []);
    } catch { /* corrupt or blocked storage: start empty */ }
  }

  private persist(): void {
    try {
      const db: Db = { families: this.families(), residents: this.residents(), records: this.records() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch { /* storage full or blocked: keep working in memory */ }
  }

  private newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

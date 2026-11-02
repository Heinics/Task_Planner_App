export type Role = 'BHW' | 'Nurse' | 'Admin';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type Gender = 'Female' | 'Male' | 'Other';

export const GENDERS: Gender[] = ['Female', 'Male', 'Other'];
export const RELATIONS = ['Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Other'];
export const AGE_GROUPS = [
  { key: '', label: 'All ages', min: 0, max: 200 },
  { key: '0-5', label: '0-5 yrs', min: 0, max: 5 },
  { key: '6-17', label: '6-17 yrs', min: 6, max: 17 },
  { key: '18-59', label: '18-59 yrs', min: 18, max: 59 },
  { key: '60+', label: '60+ yrs', min: 60, max: 200 }
];

/** Fields every stored entity carries so it can be queued for sync. */
export interface Syncable {
  sync: SyncStatus;
  /** ISO timestamp; used for last-write-wins conflict resolution. */
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  barangay: string;
  passwordHash: string;
  active: boolean;
}

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  barangay: string;
}

export interface Family extends Syncable {
  id: string;
  householdNo: string;
  barangay: string;
  sitio: string;
  address: string;
  contactNumber: string;
  philhealthNo: string;
  emergencyContact: string;
  createdBy: string;
  /** yyyy-MM-dd */
  createdAt: string;
}
export type FamilyInput = Omit<Family, 'id' | 'createdBy' | 'createdAt' | 'sync' | 'updatedAt'>;

export interface Resident extends Syncable {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  /** yyyy-MM-dd */
  birthDate: string;
  gender: Gender;
  relation: string;
  philhealthNo: string;
  contactNumber: string;
  deceased: boolean;
  /** yyyy-MM-dd, only when deceased */
  dateOfDeath: string;
  createdAt: string;
}
export type ResidentInput = Omit<Resident, 'id' | 'familyId' | 'createdAt' | 'sync' | 'updatedAt'>;

export type RecordType =
  'prenatal' | 'postnatal' | 'immunization' | 'tb' | 'chronic' | 'nutrition' | 'consultation' | 'referral';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface RecordTypeDef {
  type: RecordType;
  label: string;
  icon: string;
  fields: FieldDef[];
}

const YES_NO = ['Yes', 'No'];

/** One definition per health program. The record form is generated from `fields`. */
export const RECORD_TYPES: RecordTypeDef[] = [
  {
    type: 'prenatal', label: 'Prenatal', icon: 'heart-outline', fields: [
      { key: 'lmp', label: 'Last menstrual period (LMP)', type: 'date' },
      { key: 'edc', label: 'Expected date of confinement (EDC)', type: 'date' },
      { key: 'gravida', label: 'Gravida', type: 'number' },
      { key: 'para', label: 'Para', type: 'number' },
      { key: 'bloodPressure', label: 'Blood pressure (e.g. 110/70)', type: 'text' },
      { key: 'weight', label: 'Weight (kg)', type: 'number' },
      { key: 'urineTest', label: 'Urine test', type: 'select', options: ['Normal', 'Abnormal', 'Not done'] },
      { key: 'iron', label: 'Iron supplementation given', type: 'select', options: YES_NO },
      { key: 'nextVisit', label: 'Next visit', type: 'date' }
    ]
  },
  {
    type: 'postnatal', label: 'Postnatal', icon: 'happy-outline', fields: [
      { key: 'deliveryDate', label: 'Date of delivery', type: 'date' },
      { key: 'place', label: 'Place of delivery', type: 'select', options: ['Home', 'Health facility', 'Hospital'] },
      { key: 'attendedBy', label: 'Attended by', type: 'select', options: ['Doctor', 'Nurse', 'Midwife', 'Hilot'] },
      { key: 'motherCondition', label: 'Mother condition', type: 'text' },
      { key: 'babyWeight', label: 'Baby weight (kg)', type: 'number' },
      { key: 'breastfeeding', label: 'Breastfeeding', type: 'select', options: ['Exclusive', 'Mixed', 'None'] },
      { key: 'nextVisit', label: 'Next visit', type: 'date' }
    ]
  },
  {
    type: 'immunization', label: 'Immunization', icon: 'medkit-outline', fields: [
      {
        key: 'vaccine', label: 'Vaccine', type: 'select',
        options: ['BCG', 'Hepatitis B', 'Pentavalent', 'OPV', 'IPV', 'PCV', 'MMR', 'Td', 'Influenza', 'COVID-19', 'Other']
      },
      { key: 'dose', label: 'Dose (e.g. 1st, 2nd, booster)', type: 'text' },
      { key: 'nextDose', label: 'Next dose due', type: 'date' }
    ]
  },
  {
    type: 'tb', label: 'TB / DOTS', icon: 'pulse-outline', fields: [
      { key: 'tbType', label: 'Type', type: 'select', options: ['Pulmonary', 'Extra-pulmonary'] },
      { key: 'regimen', label: 'Regimen', type: 'text' },
      { key: 'treatmentStart', label: 'Treatment start', type: 'date' },
      { key: 'sputum', label: 'Sputum result', type: 'select', options: ['Positive', 'Negative', 'Not done'] },
      {
        key: 'outcome', label: 'Outcome', type: 'select',
        options: ['On treatment', 'Cured', 'Treatment completed', 'Lost to follow-up', 'Failed', 'Died']
      },
      { key: 'nextVisit', label: 'Next visit', type: 'date' }
    ]
  },
  {
    type: 'chronic', label: 'Hypertension / Diabetes', icon: 'fitness-outline', fields: [
      { key: 'condition', label: 'Condition', type: 'select', options: ['Hypertension', 'Diabetes', 'Both', 'Other'] },
      { key: 'bloodPressure', label: 'Blood pressure (e.g. 130/85)', type: 'text' },
      { key: 'bloodSugar', label: 'Blood sugar (mg/dL)', type: 'number' },
      { key: 'medication', label: 'Medication', type: 'text' },
      { key: 'adherence', label: 'Taking medicine regularly', type: 'select', options: YES_NO },
      { key: 'nextVisit', label: 'Next visit', type: 'date' }
    ]
  },
  {
    type: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', fields: [
      { key: 'weight', label: 'Weight (kg)', type: 'number' },
      { key: 'height', label: 'Height (cm)', type: 'number' },
      {
        key: 'status', label: 'Nutrition status', type: 'select',
        options: ['Normal', 'Underweight', 'Wasted', 'Stunted', 'Overweight', 'Obese']
      }
    ]
  },
  {
    type: 'consultation', label: 'Checkup', icon: 'clipboard-outline', fields: [
      { key: 'complaint', label: 'Chief complaint', type: 'text' },
      { key: 'bloodPressure', label: 'Blood pressure', type: 'text' },
      { key: 'temperature', label: 'Temperature (°C)', type: 'number' },
      { key: 'diagnosis', label: 'Diagnosis / assessment', type: 'text' },
      { key: 'treatment', label: 'Treatment given', type: 'text' }
    ]
  },
  {
    type: 'referral', label: 'Referral', icon: 'arrow-redo-outline', fields: [
      { key: 'referredTo', label: 'Referred to (RHU / hospital)', type: 'text' },
      { key: 'reason', label: 'Reason', type: 'text' },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['Routine', 'Urgent', 'Emergency'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Completed'] }
    ]
  }
];

export function typeDef(type: RecordType): RecordTypeDef {
  return RECORD_TYPES.find(t => t.type === type) ?? RECORD_TYPES[0];
}

export interface HealthRecord extends Syncable {
  id: string;
  residentId: string;
  type: RecordType;
  /** yyyy-MM-dd visit date */
  date: string;
  data: Record<string, string>;
  remarks: string;
  /** Set by a Nurse or Admin after review. */
  verified: boolean;
  verifiedBy: string;
  createdBy: string;
}

export type SyncKind = 'family' | 'resident' | 'record';

export interface QueueItem {
  kind: SyncKind;
  id: string;
  label: string;
  status: SyncStatus;
  updatedAt: string;
}

export interface ReportFilter { from: string; to: string; barangay: string; }

// ---------- helpers ----------
export function fullName(p: Pick<Resident, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function initials(p: Pick<Resident, 'firstName' | 'lastName'>): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
}

export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ageOf(birthDate: string): number {
  if (!birthDate) return 0;
  const b = new Date(birthDate);
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  const beforeBirthday =
    n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate());
  if (beforeBirthday) age--;
  return Math.max(0, age);
}

/** Short one-line summary of a record for list rows. */
export function recordSummary(r: HealthRecord): string {
  const def = typeDef(r.type);
  return def.fields
    .filter(f => f.type !== 'date' && (r.data[f.key] ?? '').trim() !== '')
    .slice(0, 3)
    .map(f => r.data[f.key])
    .join(' · ');
}

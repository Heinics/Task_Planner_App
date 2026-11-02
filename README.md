# CHIA – Community Health Information Application

Ionic + Angular (standalone components, signals). Built on top of your `src.zip`
(same structure and design system: signals service, tabs, modal forms, hero headers).

## How to run
1. Replace the `src/` folder of your Ionic Angular project with this `src/`.
2. No new npm packages are needed (only `@ionic/angular`, `ionicons`, Angular, already in your project).
3. `ionic serve` and log in with a demo account:

| Username | Password | Role |
|---|---|---|
| bhw | bhw123 | Barangay Health Worker |
| nurse | nurse123 | Nurse / Midwife (can verify records) |
| admin | admin123 | Admin |

Tap **Load sample data** on the dashboard to try it with demo families.
Change the demo accounts in `services/auth.service.ts` before real use.

## What is included (MVP 1-8 from the design)
- Login, role-based access (BHW / Nurse / Admin), offline login, "remember me", route guard
- Family profile: household no., barangay, sitio, address, PhilHealth, emergency contact, dynamic family members
- Resident profile: search + filters (barangay, age group, gender, health program), deceased flag
- Health records (one modular form per program): prenatal, postnatal, immunization, TB/DOTS,
  hypertension/diabetes, nutrition, checkup, referral. Fields are defined in `models/chia.model.ts` (`RECORD_TYPES`),
  so adding a field or program is one entry.
- Nurse/Admin verification of records (swipe a record left). Editing a record clears its verification.
- Offline saving: everything is stored on the device on every change
- Sync queue: pending / failed / synced status per item, online indicator, retry, last sync time
- Reports: totals, cases per program (bar chart), filters by date range and barangay, CSV export (opens in Excel)

## Not done yet / honest notes
- **Not compiled here.** I had no network to `npm install`, so I could not run `ng build`. I syntax-checked every
  `.ts` file, type-checked the models, and ran the services' logic (login, queue, verify, cascade delete, filters,
  sync) in a test harness. Template/Ionic typing errors, if any, will show on your first `ng build`.
- **Storage is `localStorage`**, same as your base project, not SQLite. Fine for a demo / small barangay; for
  thousands of records move `persist()/load()` in `health.service.ts` to Capacitor SQLite (next step).
- **Sync is demo mode** until you set `apiUrl` in `environments/environment.ts`. Then each item is POSTed to
  `${apiUrl}/sync/{family|resident|record}`. JWT auth, and last-write-wins conflict handling using `updatedAt`,
  must be done on the server.
- Not yet built: user management, barangay/sitio management (barangay and sitio are typed text), PDF export,
  QR scanner, maps, password reset, activity log.
- The Inter font loads from Google Fonts. For true offline use, bundle the font files in `assets/`.
- Health data is personal data (Data Privacy Act). Before real use: device encryption, a privacy notice, and a
  proper server-side access policy.

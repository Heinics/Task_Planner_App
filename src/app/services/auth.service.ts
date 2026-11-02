import { Injectable, computed, signal } from '@angular/core';
import { Role, Session, User } from '../models/chia.model';

const USERS_KEY = 'chia-users-v1';
const SESSION_KEY = 'chia-session-v1';

async function sha256(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // crypto.subtle is only available in secure contexts; fall back so login still works.
    return 'plain:' + text;
  }
}

/**
 * Local (offline) authentication. Users live on the device so login works with no internet.
 * When a backend exists, replace `login` with a JWT call and keep this as the offline fallback.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly role = computed<Role | null>(() => this.session()?.role ?? null);
  /** Nurses and admins can verify records submitted by BHWs. */
  readonly canVerify = computed(() => this.role() === 'Nurse' || this.role() === 'Admin');

  constructor() {
    this.restore();
  }

  async login(username: string, password: string, remember: boolean): Promise<string | null> {
    await this.ensureSeed();
    const users = this.readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || !user.active) return 'Wrong username or password.';
    if (user.passwordHash !== (await sha256(password))) return 'Wrong username or password.';

    const session: Session = {
      userId: user.id, username: user.username, fullName: user.fullName,
      role: user.role, barangay: user.barangay
    };
    this.session.set(session);
    try {
      const store = remember ? localStorage : sessionStorage;
      (remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);
      store.setItem(SESSION_KEY, JSON.stringify(session));
    } catch { /* storage blocked: stay logged in for this run only */ }
    return null;
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      if (raw) this.session.set(JSON.parse(raw) as Session);
    } catch { /* corrupt session: ask to log in again */ }
  }

  private readUsers(): User[] {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as User[];
    } catch {
      return [];
    }
  }

  /** First run: create demo accounts. Change these before real use. */
  private async ensureSeed(): Promise<void> {
    if (this.readUsers().length) return;
    const mk = async (username: string, pw: string, fullName: string, role: Role): Promise<User> => ({
      id: username, username, fullName, role, barangay: 'San Isidro',
      passwordHash: await sha256(pw), active: true
    });
    const users = [
      await mk('bhw', 'bhw123', 'Maria Santos (BHW)', 'BHW'),
      await mk('nurse', 'nurse123', 'Ana Reyes (Nurse)', 'Nurse'),
      await mk('admin', 'admin123', 'System Admin', 'Admin')
    ];
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch { /* ignore */ }
  }
}

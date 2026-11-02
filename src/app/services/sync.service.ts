import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { HealthService } from './health.service';
import { QueueItem, SyncStatus } from '../models/chia.model';

const LAST_SYNC_KEY = 'chia-last-sync-v1';

/**
 * Pushes pending/failed items to the server.
 * With `environment.apiUrl` empty there is no server, so a run simply marks the queue as synced
 * (demo mode). Set `apiUrl` to POST each item to `${apiUrl}/sync/{family|resident|record}`.
 * Conflict rule on the server side should be last-write-wins using each item's `updatedAt`.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private health = inject(HealthService);

  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly syncing = signal(false);
  readonly lastSync = signal<string>(localStorage.getItem(LAST_SYNC_KEY) ?? '');
  readonly demoMode = !environment.apiUrl;

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  async syncNow(): Promise<{ ok: boolean; message: string }> {
    if (!this.online()) return { ok: false, message: 'No internet connection. Your records are safe on this device.' };
    if (this.syncing()) return { ok: false, message: 'Sync already running.' };
    const items = this.health.queue();
    if (!items.length) return { ok: true, message: 'Everything is already synced.' };

    this.syncing.set(true);
    try {
      const results: { kind: QueueItem['kind']; id: string; status: SyncStatus }[] = [];
      for (const item of items) {
        const ok = await this.push(item);
        results.push({ kind: item.kind, id: item.id, status: ok ? 'synced' : 'failed' });
      }
      this.health.applySyncResults(results);
      const failed = results.filter(r => r.status === 'failed').length;
      if (failed < results.length) this.markSynced();
      return failed
        ? { ok: false, message: `${results.length - failed} synced, ${failed} failed. Tap retry.` }
        : { ok: true, message: `${results.length} record(s) synced.` };
    } finally {
      this.syncing.set(false);
    }
  }

  private async push(item: QueueItem): Promise<boolean> {
    if (!environment.apiUrl) return true;
    try {
      const res = await fetch(`${environment.apiUrl}/sync/${item.kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.health.payload(item.kind, item.id))
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private markSynced(): void {
    const now = new Date().toISOString();
    this.lastSync.set(now);
    try { localStorage.setItem(LAST_SYNC_KEY, now); } catch { /* ignore */ }
  }
}

import { Injectable } from '@angular/core';

/** Successful item visits only, isolated by account, facility and group for this app session. */
@Injectable({ providedIn: 'root' })
export class EnergyUseWorkbenchSessionService {
  private readonly visits = new Map<string, string>();
  read(key: string): string | undefined { return this.visits.get(key); }
  remember(key: string, guid: string): void { this.visits.set(key, guid); }
}

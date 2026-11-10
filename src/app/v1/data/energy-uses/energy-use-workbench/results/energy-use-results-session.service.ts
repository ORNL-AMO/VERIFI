import { Injectable } from '@angular/core';

export interface EnergyUseResultsView {
  readonly history: boolean;
}

/** Presentation only; nothing is saved to equipment, groups or browser storage. */
@Injectable({ providedIn: 'root' })
export class EnergyUseResultsSessionService {
  private readonly views = new Map<string, EnergyUseResultsView>();
  read(key: string): EnergyUseResultsView | undefined { return this.views.get(key); }
  save(key: string, view: EnergyUseResultsView): void { this.views.set(key, { ...view }); }
}

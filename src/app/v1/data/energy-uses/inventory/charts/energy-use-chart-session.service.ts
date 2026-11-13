import { Injectable } from '@angular/core';
export interface EnergyUseChartView { readonly nodeId: string; }
/** Session-only preferences, independently keyed by account/facility/group. */
@Injectable({ providedIn: 'root' })
export class EnergyUseChartSessionService {
  private readonly views = new Map<string, EnergyUseChartView>();
  read(key: string): EnergyUseChartView | undefined { return this.views.get(key); }
  save(key: string, value: EnergyUseChartView): void { this.views.set(key, { ...value }); }
}

import { Injectable, signal } from '@angular/core';
import { ReportWorkbenchStage } from './report-workbench.models';

/** Presentation bridge from the mounted workbench to the shell; owns no checks or persistence. */
@Injectable({ providedIn: 'root' })
export class ReportStageStateService {
  readonly current = signal<{ key: string; stages: readonly ReportWorkbenchStage[] } | undefined>(undefined);
  publish(key: string, stages: readonly ReportWorkbenchStage[]): void { this.current.set({ key, stages }); }
  clear(key: string): void { if (this.current()?.key === key) this.current.set(undefined); }
}

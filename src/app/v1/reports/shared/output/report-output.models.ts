import { Signal } from '@angular/core';
import { ReportExportFormat } from '@shared/report-output/report-output.models';

export interface ReportOutputState {
  readonly phase: 'idle' | 'preparing' | 'building' | 'delivering' | 'error';
  readonly message: string;
  readonly completed?: number;
  readonly total?: number;
}

export interface ReportOutputCapability {
  readonly formats: readonly ReportExportFormat[];
  readonly available: Signal<boolean>;
  readonly busy: Signal<boolean>;
  readonly unavailableReason: Signal<string>;
  readonly state: Signal<ReportOutputState>;
  generate(format: ReportExportFormat): Promise<void>;
  cancel(): void;
}

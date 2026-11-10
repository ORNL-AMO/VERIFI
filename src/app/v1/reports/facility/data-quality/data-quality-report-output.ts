import { signal } from '@angular/core';
import { ReportOutputCapability, ReportOutputState } from '@app/v1/reports/shared/output/report-output.models';

export const DATA_QUALITY_PDF_UNAVAILABLE = 'PDF export is not available yet.';

export function dataQualityReportOutput(): ReportOutputCapability {
  return {
    formats: ['pdf'],
    available: signal(false).asReadonly(),
    busy: signal(false).asReadonly(),
    unavailableReason: signal(DATA_QUALITY_PDF_UNAVAILABLE).asReadonly(),
    state: signal<ReportOutputState>({ phase: 'idle', message: '' }).asReadonly(),
    generate: async () => {},
    cancel: () => {}
  };
}

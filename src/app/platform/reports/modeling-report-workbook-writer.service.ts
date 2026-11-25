import { Injectable } from '@angular/core';
import { ModelingReportWorkbook } from '@domain/reports/modeling-report-workbook';

@Injectable({ providedIn: 'root' })
export class ModelingReportWorkbookWriter {
  async build(input: ModelingReportWorkbook, signal?: AbortSignal): Promise<Blob> {
    signal?.throwIfAborted();
    const { buildModelingWorkbook } = await import('./modeling-report-workbook');
    return buildModelingWorkbook(input, signal);
  }
}

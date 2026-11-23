import { Injectable, computed, inject } from '@angular/core';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportExportSource, reportArtifact } from '@shared/report-output/report-output.models';
import { ReportExportController } from '@app/v1/reports/shared/output/report-export-controller';
import { AccountEmissionFactorsReportSnapshot, emissionFactorsHaveContent } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';
import { AccountEmissionFactorsReportService } from '../emission-factors-report.service';
import { accountEmissionFactorsPdfDocument } from './emission-factors-report-output.view';

@Injectable()
export class AccountEmissionFactorsReportOutputService {
  private readonly report = inject(AccountEmissionFactorsReportService);
  private readonly pdf = inject(PdfReportWriter);
  readonly source = computed<ReportExportSource<AccountEmissionFactorsReportSnapshot>>(() => {
    const state = this.report.state(), snapshot = this.report.exportSnapshot(), onReport = this.report.context.stage() === 'report';
    if (!onReport || !this.report.editor.setupValid() || !snapshot) return {
      state: 'unavailable', message: state.message || 'Prepare a valid report before exporting.',
      transient: onReport && this.report.editor.setupValid() && ['waiting', 'loading'].includes(state.state)
    };
    if (!snapshot.results.some(emissionFactorsHaveContent)) return { state: 'unavailable', message: 'No applicable emission factors are available to export.' };
    return { state: 'ready', value: snapshot, key: JSON.stringify(snapshot, (_key, value: unknown) =>
      typeof value === 'number' && !Number.isFinite(value) ? { nonFiniteNumber: String(value) } : value) };
  });
  readonly output = new ReportExportController({ formats: ['pdf'], source: this.source, flush: () => this.report.editor.flush(),
    build: async (format, snapshot, context) => {
      if (format !== 'pdf') throw new Error('This report supports PDF output only.');
      context.signal.throwIfAborted(); context.progress('Building emission factors report…');
      const blob = await this.pdf.build(accountEmissionFactorsPdfDocument(snapshot), { signal: context.signal,
        strictAssets: true, orientation: 'landscape', format: 'a4',
        onProgress: (completed, total) => context.progress('Building emission factors report…', completed, total) });
      return reportArtifact(blob, `${snapshot.name} - ${snapshot.accountName} - ${snapshot.startYear}-${snapshot.endYear}`, 'pdf');
    }
  });
}

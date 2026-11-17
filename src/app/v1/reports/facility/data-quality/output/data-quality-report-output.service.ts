import { Injectable, computed, inject } from '@angular/core';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportExportSource, reportArtifact } from '@shared/report-output/report-output.models';
import { EChartsImageService, PDF_CHART_IMAGE_OPTIONS } from '@app/v1/shared/charts/echarts-image.service';
import { ReportExportController } from '@app/v1/reports/shared/output/report-export-controller';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityReportSnapshot } from '../data-quality-report.view';
import { dataQualityHasPdfContent, dataQualityPdfDocument } from './data-quality-report-output.view';

@Injectable()
export class DataQualityReportOutputService {
  private readonly report = inject(DataQualityReportService);
  private readonly pdf = inject(PdfReportWriter);
  private readonly images = inject(EChartsImageService);
  readonly source = computed<ReportExportSource<DataQualityReportSnapshot>>(() => {
    const state = this.report.state(), snapshot = this.report.exportSnapshot();
    const onReport = this.report.context.stage() === 'report';
    if (!onReport || !this.report.editor.setupValid() || !snapshot) return {
      state: 'unavailable', message: state.message || 'Prepare the report with a valid selection before exporting.',
      transient: onReport && this.report.editor.setupValid() && ['waiting', 'loading'].includes(state.state)
    };
    if (!dataQualityHasPdfContent(snapshot)) return {
      state: 'unavailable', message: 'Choose report content in Setup before exporting.'
    };
    const key = JSON.stringify(snapshot, (_key, value: unknown) => typeof value === 'number' && !Number.isFinite(value)
      ? { nonFiniteNumber: String(value) } : value);
    return { state: 'ready', key, value: snapshot };
  });
  readonly output = new ReportExportController({
    formats: ['pdf'], source: this.source, flush: () => this.report.editor.flush(),
    build: async (format, snapshot, context) => {
      if (format !== 'pdf') throw new Error('This report supports PDF output only.');
      const { document, charts } = dataQualityPdfDocument(snapshot);
      let completed = 0;
      for (const chart of charts) chart.section.imageDataProvider = async () => {
        context.signal.throwIfAborted();
        context.progress('Rendering report charts…', completed, charts.length);
        const image = await this.images.capture(chart.option, PDF_CHART_IMAGE_OPTIONS, context.signal);
        context.progress('Rendering report charts…', ++completed, charts.length);
        return image;
      };
      context.progress('Building report…');
      const blob = await this.pdf.build(document, {
        signal: context.signal, strictAssets: true, orientation: 'landscape', format: 'a4'
      });
      return reportArtifact(blob, `${snapshot.name} — ${snapshot.facility.name} — Data Quality`, 'pdf');
    }
  });
}

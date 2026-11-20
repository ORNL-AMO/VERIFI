import { Injectable, computed, inject } from '@angular/core';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { PptReportWriter } from '@platform/reports/ppt-report-writer';
import { ReportExportSource, reportArtifact } from '@shared/report-output/report-output.models';
import { ReportExportController } from '@app/v1/reports/shared/output/report-export-controller';
import { ModelingOutputChart, ModelingReportExportSnapshot, modelingReportSections } from '@app/v1/reports/shared/modeling/output/modeling-report-output';
import { modelingPdfDocument } from '@app/v1/reports/shared/modeling/output/modeling-report-pdf';
import { EChartsImageService, PDF_CHART_IMAGE_OPTIONS } from '@app/v1/shared/charts/echarts-image.service';
import { analysisModelComparisonChart } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.view';
import { modelingPptDocument } from '@app/v1/reports/shared/modeling/output/modeling-report-ppt';
import { FacilityModelingReportService } from '../modeling-report.service';

@Injectable()
export class ModelingReportOutputService {
  private readonly report = inject(FacilityModelingReportService);
  private readonly pdf = inject(PdfReportWriter);
  private readonly ppt = inject(PptReportWriter);
  private readonly images = inject(EChartsImageService);
  readonly source = computed<ReportExportSource<ModelingReportExportSnapshot>>(() => {
    const state = this.report.state(), snapshot = this.report.exportSnapshot();
    const onReport = this.report.context.stage() === 'report';
    if (!onReport || !this.report.editor.setupValid() || !snapshot) return {
      state: 'unavailable', message: state.message || 'Prepare the report with a valid selection before exporting.',
      transient: onReport && this.report.editor.setupValid() && ['waiting', 'loading'].includes(state.state)
    };
    if (!snapshot.view.hasContent) return { state: 'unavailable', message: 'Choose report content in Setup before exporting.' };
    // Only printed content and immutable scope identity affect delivery freshness.
    const key = JSON.stringify([snapshot.identity, snapshot.name, snapshot.scopeName, snapshot.view.reportYear, modelingReportSections(snapshot.view)]);
    return { state: 'ready', key, value: snapshot };
  });
  readonly output = new ReportExportController({
    formats: ['pdf', 'pptx'], source: this.source, flush: () => this.report.editor.flush(),
    build: async (format, snapshot, context) => {
      context.progress('Building report…');
      const name = `${snapshot.name} — ${snapshot.scopeName} — Modeling — ${snapshot.view.reportYear}`;
      const provider = (chart: ModelingOutputChart) => async () => {
        context.signal.throwIfAborted(); context.progress('Rendering model comparison chart…');
        const option = analysisModelComparisonChart(chart.modelComparison);
        if (!option) throw new Error('The model comparison chart is unavailable.');
        return this.images.capture(option, format === 'pdf' ? PDF_CHART_IMAGE_OPTIONS : undefined, context.signal);
      };
      if (format === 'pdf') {
        const document = modelingPdfDocument(snapshot);
        for (const section of document.sections) if (section.type === 'chart') {
          (section as ModelingOutputChart).imageDataProvider = provider(section as ModelingOutputChart);
        }
        return reportArtifact(await this.pdf.build(document, {
          signal: context.signal, strictAssets: true, orientation: 'landscape', format: 'a4',
          onProgress: (completed, total) => context.progress('Building report…', completed, total)
        }), name, 'pdf');
      }
      if (format === 'pptx') return reportArtifact(await this.ppt.build(modelingPptDocument(snapshot, provider), {
        signal: context.signal, strictAssets: true, layout: 'wide', minimumTableFontSize: 12,
        onProgress: (completed, total) => context.progress('Building report…', completed, total)
      }), name, 'pptx');
      throw new Error('This report does not support that export format.');
    }
  });
}

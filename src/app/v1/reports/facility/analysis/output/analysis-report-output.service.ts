import { Injectable, computed, inject } from '@angular/core';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { PptReportWriter } from '@platform/reports/ppt-report-writer';
import {
  ReportExportContext, ReportExportFormat, ReportExportSource, reportArtifact
} from '@shared/report-output/report-output.models';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { ReportSection } from '@shared/report-output/report-section.model';
import { PptDocument } from '@shared/report-output/ppt-document';
import { PptSlide } from '@shared/report-output/ppt-slide';
import { EChartsImageService, PDF_CHART_IMAGE_OPTIONS } from '@app/v1/shared/charts/echarts-image.service';
import { ReportExportController } from '@app/v1/reports/shared/output/report-export-controller';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { FacilityAnalysisDocument, buildFacilityAnalysisDocument } from '../analysis-report-document';
import { AnalysisOutputBlock, AnalysisOutputFigure, facilityAnalysisOutputBlocks } from './analysis-report-output.view';

@Injectable()
export class AnalysisReportOutputService {
  private readonly report = inject(FacilityAnalysisReportService);
  private readonly pdf = inject(PdfReportWriter);
  private readonly ppt = inject(PptReportWriter);
  private readonly images = inject(EChartsImageService);
  readonly source = computed<ReportExportSource<FacilityAnalysisDocument>>(() => {
    const state = this.report.state(), context = this.report.context;
    const report = context.report(), facility = context.facility();
    const analysis = context.workspace.facilityAnalyses().find(item => item.guid === report?.analysisItemId && item.facilityId === facility?.guid);
    if (context.stage() !== 'report' || state.state !== 'ready' || !state.value?.completed || !state.value.results || !report || !analysis || !facility) {
      return { state: 'unavailable', message: state.message || 'Prepare the report and complete Data Checks before exporting.',
        transient: context.stage() === 'report' && !!report && !!facility && !!analysis && (state.state === 'waiting' || state.state === 'loading') };
    }
    const value = buildFacilityAnalysisDocument(report, analysis, facility, state.value.results, state.value.checks, this.report.groupNames());
    if (!value.sections.length) return { state: 'unavailable', message: 'Choose report content in Setup before exporting.' };
    return { state: 'ready', key: JSON.stringify([context.key(), value.name, subtitle(value), facilityAnalysisOutputBlocks(value)]), value };
  });
  readonly output = new ReportExportController({
    formats: ['pdf', 'pptx'], source: this.source, flush: () => this.report.editor.flush(),
    build: async (format, snapshot, context) => {
      const blocks = facilityAnalysisOutputBlocks(snapshot);
      const providers = imageProviders(blocks, this.images, context, format);
      context.progress('Building report…');
      const name = `${snapshot.name} — ${snapshot.facility.name} — ${snapshot.results.reportYear ?? snapshot.settings.reportYear}`;
      if (format === 'pdf') return reportArtifact(await this.pdf.build(analysisPdfDocument(snapshot, blocks, providers), {
        signal: context.signal, strictAssets: true, orientation: 'landscape', format: 'a4'
      }), name, 'pdf');
      if (format === 'pptx') return reportArtifact(await this.ppt.build(analysisPptDocument(snapshot, blocks, providers), {
        signal: context.signal, strictAssets: true, layout: 'wide', minimumTableFontSize: 12
      }), name, 'pptx');
      throw new Error('This report does not support that export format.');
    }
  });
}

type ImageProviders = ReadonlyMap<AnalysisOutputFigure, () => Promise<string>>;

function imageProviders(blocks: readonly AnalysisOutputBlock[], images: EChartsImageService,
  context: ReportExportContext, format: ReportExportFormat): ImageProviders {
  const figures = blocks.flatMap(block => block.entries).filter((entry): entry is AnalysisOutputFigure =>
    entry.kind === 'figure' && (format !== 'pptx' || !entry.native));
  let completed = 0;
  return new Map(figures.map(figure => [figure, async () => {
    context.signal.throwIfAborted();
    context.progress('Rendering report charts…', completed, figures.length);
    const image = await images.capture(figure.option, format === 'pdf' ? PDF_CHART_IMAGE_OPTIONS : undefined, context.signal);
    context.progress('Rendering report charts…', ++completed, figures.length);
    return image;
  }]));
}

function subtitle(doc: FacilityAnalysisDocument): string {
  return `${doc.facility.name} · ${doc.analysis.name} · ${doc.analysis.analysisCategory === 'water' ? 'Water' : doc.analysis.energyIsSource ? 'Source energy' : 'Site energy'} (${doc.unit}) · ${doc.facility.fiscalYear === 'nonCalendarYear' ? 'Fiscal years' : 'Years'} ${doc.analysis.baselineYear}–${doc.results.reportYear ?? doc.settings.reportYear}`;
}

export function analysisPdfDocument(doc: FacilityAnalysisDocument, blocks: readonly AnalysisOutputBlock[], providers: ImageProviders): ReportDocument {
  const sections: ReportSection[] = [];
  for (const block of blocks) {
    sections.push({ type: 'heading', title: block.title, tocInclude: true, tocLabel: block.title, bookmarkLevel: 0 });
    for (const entry of block.entries) {
      switch (entry.kind) {
        case 'text': sections.push({ type: 'text', title: entry.title, content: entry.text }); break;
        case 'figure': sections.push({ type: 'chart', title: entry.title, imageDataProvider: providers.get(entry) }); break;
        case 'table':
          sections.push({ type: 'table', title: entry.title, headers: entry.headers.map(header => ({ content: header.content, colSpan: header.span })),
            subHeaders: entry.subHeaders ? [...entry.subHeaders] : undefined, rows: entry.rows.map(row => [...row]) });
          if (entry.note) sections.push({ type: 'text', content: entry.note });
          break;
      }
    }
  }
  return { metadata: { title: doc.name, subtitle: subtitle(doc), facilityName: doc.facility.name, dateGenerated: new Date().toISOString() }, sections };
}

export function analysisPptDocument(doc: FacilityAnalysisDocument, blocks: readonly AnalysisOutputBlock[], providers: ImageProviders): PptDocument {
  const date = new Date().toISOString();
  const slides: PptSlide[] = [{ type: 'title', title: doc.name, subtitle: subtitle(doc), date }];
  for (const block of blocks) {
    slides.push({ type: 'title', title: block.title, layout: 'section' });
    for (const entry of block.entries) {
      switch (entry.kind) {
        case 'text': slides.push({ type: 'table', title: entry.title ?? block.title, headers: ['Report note'], rows: [[entry.text]] }); break;
        case 'figure': slides.push(entry.native ?? { type: 'image', title: entry.title, imageDataProvider: providers.get(entry), imageWidth: 1200, imageHeight: 675 }); break;
        case 'table': slides.push({ type: 'table', title: `${block.title} — ${entry.title}`,
          headers: entry.headers.map(header => ({ content: header.content, colspan: header.span })),
          subHeaders: entry.subHeaders ? [...entry.subHeaders] : undefined, rows: entry.rows.map(row => [...row]), note: entry.note }); break;
      }
    }
  }
  return { metadata: { title: doc.name, subtitle: subtitle(doc), date }, slides };
}

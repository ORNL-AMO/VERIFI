import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { EChartsImageService, PDF_CHART_IMAGE_OPTIONS } from '@app/v1/shared/charts/echarts-image.service';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportOutputService } from './analysis-report-output.service';

describe('Facility Analysis files without a mounted preview', () => {
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it.each(['standard', 'regression', 'gapped'] as const)(
    'exports %s results as JPEG PDF and editable PowerPoint without a mounted preview', async mode => {
      const fixture = facilityAnalysisReportFixture(
        mode === 'regression' ? regressionAnalysisReportFixture() : undefined);
      const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(
        fixture.snapshot, fixture.facility.guid, fixture.analysis.guid), fixture.report.analysisReportSettings.reportYear);
      if (mode === 'gapped') fixture.results.groupSummaries[0].annualAnalysisSummaryData[0].isIntermediateBanked = true;
      const stage = signal('report');
      const delivered: ReportArtifact[] = [];
      const flush = vi.fn(async () => true);
      const service = {
        context: { stage, key: () => 'facility-report', report: () => fixture.report, facility: () => fixture.facility,
          workspace: { facilityAnalyses: () => [fixture.analysis] } }, editor: { flush },
        state: signal({ state: 'ready', value: { completed: true, results: fixture.results, checks: [checks] } }),
        groupNames: () => ({ [fixture.analysis.groups[0].idbGroupId]: 'Production' })
      };
      TestBed.configureTestingModule({ providers: [AnalysisReportOutputService,
        { provide: FacilityAnalysisReportService, useValue: service },
        { provide: ReportFileDeliveryService, useValue: {
          download: (artifact: ReportArtifact) => delivered.push(artifact)
        } }
      ] });
      const capture = vi.spyOn(TestBed.inject(EChartsImageService), 'capture');
      const outputs = TestBed.inject(AnalysisReportOutputService).output;
      expect(outputs.available()).toBe(true);
      await outputs.generate('pdf');
      expect(outputs.state().phase).toBe('idle');
      expect(delivered).toHaveLength(1);
      expect(await delivered[0].blob.slice(0, 5).text()).toBe('%PDF-');
      const pdf = new TextDecoder().decode(await delivered[0].blob.arrayBuffer());
      expect(pdf).toContain('/DCTDecode');
      expect(pdf).toContain('/Outlines');
      expect((pdf.match(/\/Subtype \/Image/g) ?? []).length).toBeGreaterThan(0);
      expect(capture).toHaveBeenCalled();
      expect(capture.mock.calls.every(([, options]) => options === PDF_CHART_IMAGE_OPTIONS)).toBe(true);
      if (mode === 'regression') expect(capture.mock.calls.some(([option]) => Array.isArray(option.series)
        && option.series.some(series => series.type === 'scatter')
        && option.series.some(series => series.type === 'line' && series.markArea))).toBe(true);
      if (mode === 'gapped') expect(capture.mock.calls.some(([option]) => Array.isArray(option.series)
        && option.series.some(series => Array.isArray(series.data) && series.data.includes(null)))).toBe(true);
      capture.mockClear();
      await outputs.generate('pptx');
      expect(delivered).toHaveLength(2);
      const zip = await JSZip.loadAsync(await delivered[1].blob.arrayBuffer());
      const charts = Object.keys(zip.files).filter(path => /^ppt\/charts\/chart\d+\.xml$/.test(path));
      expect(charts.length).toBeGreaterThan(0);
      const media = Object.values(zip.files).filter(file => /^ppt\/media\/image/.test(file.name));
      expect(media.length).toBeGreaterThan(0);
      for (const image of media) expect([...(await image.async('uint8array')).slice(0, 8)])
        .toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(capture).toHaveBeenCalled();
      expect(capture.mock.calls.every(([, options]) => options === undefined)).toBe(true);
      const slideFiles = Object.values(zip.files).filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name));
      const content = (await Promise.all(slideFiles.map(file => file.async('string')))).join('\n');
      expect(content).toContain('<a:tbl>');
      expect(content).toContain(fixture.report.name);
      expect(flush).toHaveBeenCalledTimes(2);
      expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
      stage.set('setup'); TestBed.tick(); expect(outputs.available()).toBe(false);
    }, 30000
  );
});

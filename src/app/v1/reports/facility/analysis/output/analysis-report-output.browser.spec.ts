import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportOutputService } from './analysis-report-output.service';

describe('Facility Analysis files without a mounted preview', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('generates PDF charts and editable PowerPoint content without scrolling or starting calculations', async () => {
    const fixture = facilityAnalysisReportFixture();
    const stage = signal('report');
    const delivered: ReportArtifact[] = [];
    const flush = vi.fn(async () => true);
    const service = {
      context: { stage, key: () => 'facility-report', report: () => fixture.report, facility: () => fixture.facility,
        workspace: { facilityAnalyses: () => [fixture.analysis] } }, editor: { flush },
      state: signal({ state: 'ready', value: { completed: true, results: fixture.results, checks: [] } }),
      groupNames: () => ({ [fixture.analysis.groups[0].idbGroupId]: 'Production' })
    };
    TestBed.configureTestingModule({ providers: [AnalysisReportOutputService,
      { provide: FacilityAnalysisReportService, useValue: service },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ] });
    const outputs = TestBed.inject(AnalysisReportOutputService).output;
    expect(outputs.available()).toBe(true);
    await outputs.generate('pdf');
    expect(outputs.state().phase).toBe('idle');
    expect(delivered).toHaveLength(1);
    expect(await delivered[0].blob.slice(0, 5).text()).toBe('%PDF-');
    expect(delivered[0].blob.size).toBeGreaterThan(20000);
    await outputs.generate('pptx');
    expect(delivered).toHaveLength(2);
    const zip = await JSZip.loadAsync(await delivered[1].blob.arrayBuffer());
    expect(Object.keys(zip.files).filter(path => /^ppt\/charts\/chart\d+\.xml$/.test(path)).length).toBeGreaterThan(0);
    expect(Object.keys(zip.files).some(path => /^ppt\/media\/image/.test(path))).toBe(true);
    const slideFiles = Object.values(zip.files).filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name));
    const content = (await Promise.all(slideFiles.map(file => file.async('string')))).join('\n');
    expect(content).toContain('<a:tbl>');
    expect(content).toContain(fixture.report.name);
    expect(flush).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
    stage.set('setup'); TestBed.tick(); expect(outputs.available()).toBe(false);
  }, 30000);
});

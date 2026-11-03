import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FacilityReportsModule } from '../../facility-reports.module';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportPreviewComponent } from './analysis-report-preview.component';
import { AnalysisReportResultChartsComponent } from '../result-charts/analysis-report-result-charts.component';

describe('continuous facility report', () => {
  it('renders all enabled sections and groups in order, without tab or selection controls', () => {
    // Native chart rendering has browser coverage; this test protects document composition.
    TestBed.overrideComponent(AnalysisReportResultChartsComponent, { set: { template: '' } });
    const source = facilityAnalysisReportFixture(), report = signal(source.report);
    const first = source.analysis.groups[0], second = { ...first, idbGroupId: 'second-group' };
    const analysis = { ...source.analysis, groups: [first, second] };
    const results = { ...source.results, groupSummaries: [
      { ...source.results.groupSummaries[0], group: second }, source.results.groupSummaries[0]
    ] };
    const inputs = buildFacilityAnalysisReportInputs(source.snapshot, 'facility', 'facility-analysis');
    const state = signal({ state: 'ready', value: { inputs, results } });
    const service = { context: { report, facility: () => source.facility, workspace: { facilityAnalyses: () => [analysis] } }, state,
      groupNames: () => ({ [first.idbGroupId]: 'First plant group', 'second-group': 'Second plant group with a long descriptive name' }),
      checksRoute: () => ['/checks'], setupRoute: () => ['/setup'] };
    TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [provideRouter([]), { provide: FacilityAnalysisReportService, useValue: service }] });
    const fixture = TestBed.createComponent(AnalysisReportPreviewComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('article.report-document')).toHaveLength(6);
    expect(Array.from(root.querySelectorAll('.document-section-title')).map(heading => heading.textContent)).toEqual([
      'Annual facility analysis', 'Monthly facility analysis', 'First plant group — Annual results', 'First plant group — Monthly results',
      'Second plant group with a long descriptive name — Annual results', 'Second plant group with a long descriptive name — Monthly results'
    ]);
    expect(root.querySelectorAll('app-analysis-report-results-table')).toHaveLength(9);
    expect(root.querySelector('[role=tablist], [role=tabpanel], #report-group')).toBeNull();
    const ids = Array.from(root.querySelectorAll('[id]')).map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(root.querySelectorAll('.document-title')).toHaveLength(1);

    report.set({ ...source.report, analysisReportSettings: { ...source.report.analysisReportSettings, facilityMonthlyResults: false, groupAnnualResults: false } }); fixture.detectChanges();
    expect(root.querySelectorAll('article.report-document')).toHaveLength(3);
    expect(root.querySelector('#analysis-report-facility-monthly')).toBeNull();
    report.set({ ...source.report, analysisReportSettings: { ...source.report.analysisReportSettings, facilityAnnualResults: false, facilityMonthlyResults: false, groupReports: false } }); fixture.detectChanges();
    expect(root.querySelectorAll('article')).toHaveLength(0);
    expect(root.querySelector('a')?.textContent).toContain('Choose report content');

    state.set({ state: 'review-required', value: undefined } as any); fixture.detectChanges();
    expect(root.querySelector('article')).toBeNull();
  });
});

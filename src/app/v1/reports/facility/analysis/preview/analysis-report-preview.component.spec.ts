import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FacilityReportsModule } from '../../facility-reports.module';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { AnalysisReportPreviewComponent } from './analysis-report-preview.component';
import { AnalysisReportResultChartsComponent } from '../result-charts/analysis-report-result-charts.component';
import { GroupContributionsComponent } from '@app/v1/shared/analysis-results/group-contributions/group-contributions.component';
import { ContributionHeatmapComponent } from '@app/v1/shared/analysis-results/contribution-heatmap/contribution-heatmap.component';

function contributionPreview(reportYear = 2023) {
  TestBed.overrideComponent(ContributionHeatmapComponent, { set: { template: '' } });
  const source = facilityAnalysisReportFixture();
  const report = signal({ ...source.report, analysisReportSettings: { ...source.report.analysisReportSettings, reportYear,
    facilityAnnualResults: false, facilityMonthlyResults: false, groupReports: false,
    facilityGroupContributions: true, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: false } });
  const results = { ...source.results, reportYear,
    annualAnalysisSummaries: source.results.annualAnalysisSummaries.filter(row => row.year <= reportYear),
    groupSummaries: source.results.groupSummaries.map(group => ({ ...group,
      annualAnalysisSummaryData: group.annualAnalysisSummaryData.filter(row => row.year <= reportYear) })) };
  const labels = signal({ [source.analysis.groups[0].idbGroupId]: 'Selected analysis group' });
  const service = { context: { report, facility: () => source.facility, workspace: { facilityAnalyses: () => [source.analysis] } },
    state: signal({ state: 'ready', value: { results, checks: [] } }), groupNames: labels,
    setupRoute: () => ['/setup'] };
  TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [provideRouter([]),
    { provide: FacilityAnalysisReportService, useValue: service }] });
  const fixture = TestBed.createComponent(AnalysisReportPreviewComponent);
  fixture.detectChanges();
  return { fixture, report, results, labels };
}

describe('continuous facility report', () => {
  afterEach(() => TestBed.resetTestingModule());
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
    const annualTables = root.querySelectorAll<HTMLTableElement>('.v1-analysis-results-table:not(.v1-analysis-results-table--monthly)');
    expect(annualTables).toHaveLength(3);
    for (const table of annualTables) {
      expect(table.caption).toBeNull();
      expect(table.getAttribute('aria-label')).toBe(table.closest('#analysis-report-facility-annual') ? 'Facility annual results' : 'Group annual results');
      expect(table.closest('[role=region]')?.getAttribute('aria-label')).toBe(table.getAttribute('aria-label'));
    }
    const monthlyTables = root.querySelectorAll<HTMLTableElement>('.v1-analysis-results-table--monthly');
    expect(Array.from(monthlyTables).map(table => table.caption?.textContent?.trim())).toEqual([
      'Baseline year — 2022', 'Report year — 2023', 'Baseline year — 2022', 'Report year — 2023', 'Baseline year — 2022', 'Report year — 2023'
    ]);
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

  it('composes contribution tables and charts independently and uses current names without changing calculation results', () => {
    const { fixture, report, results, labels } = contributionPreview();
    const root = fixture.nativeElement as HTMLElement, original = structuredClone(results);
    const presenter = () => fixture.debugElement.query(By.directive(GroupContributionsComponent)).componentInstance as GroupContributionsComponent;
    expect(root.querySelector('.document-section-title')?.textContent).toBe('Group contributions');
    expect(root.querySelector('.v1-analysis-contributions-table')).not.toBeNull();
    expect(root.querySelector('app-contribution-heatmap')).toBeNull();
    expect(presenter().view().years.map(year => year.year)).toEqual([2023]);
    expect(presenter().embedded()).toBe(true);
    expect(presenter().showChartActions()).toBe(false);
    expect(presenter().deferUntilVisible()).toBe(true);
    labels.set({ [results.groupSummaries[0].group.idbGroupId]: 'Renamed contribution group' });
    fixture.detectChanges();
    expect(root.textContent).toContain('Renamed contribution group');
    report.update(value => ({ ...value, name: 'Renamed report', analysisReportSettings: { ...value.analysisReportSettings,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: true } }));
    fixture.detectChanges();
    expect(root.querySelector('.v1-analysis-contributions-table')).toBeNull();
    expect(root.querySelector('app-contribution-heatmap')).not.toBeNull();
    expect(root.querySelector('.document-title')?.textContent).toContain('Renamed report');
    report.update(value => ({ ...value, analysisReportSettings: { ...value.analysisReportSettings,
      facilityGroupContributionsGraphs: false } }));
    fixture.detectChanges();
    expect(root.querySelector('article')).toBeNull();
    expect(root.textContent).toContain('No report content is enabled');
    expect(results).toEqual(original);
  });

  it('keeps the enabled contribution section empty for a baseline-only report', () => {
    const { fixture } = contributionPreview(2022);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#analysis-report-facility-group-contributions')).not.toBeNull();
    expect(root.querySelector('.v1-analysis-contributions__empty [role=status]')).not.toBeNull();
    expect(root.querySelector('.v1-analysis-contributions-table tbody tr')).toBeNull();
    expect(root.querySelector('app-contribution-heatmap')).toBeNull();
  });
});

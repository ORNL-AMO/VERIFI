import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AccountReportsModule } from '../../account-reports.module';
import { AccountReportWorkbenchContext } from '../../account-report-workbench/account-report-workbench-context.service';
import { ReportResultState } from '@app/v1/shared/reports/report-result-state';
import { BetterPlantsResult } from '../better-plants-report.service';
import { BetterPlantsReportService } from '../better-plants-report.service';
import { BetterPlantsPreviewComponent } from './better-plants-preview.component';

describe('Better Plants in-app report', () => {
  afterEach(() => TestBed.resetTestingModule());
  async function setup(category: 'energy' | 'water' = 'energy') {
    const snapshot = analysisReportFixture(category), workspace = new AccountWorkspaceStore(); workspace.publish(snapshot);
    const inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
    const state = signal<ReportResultState<BetterPlantsResult>>({ key: 'view', state: 'ready', value: { inputs, summaries: calculateBetterPlantsReport(inputs, [2023]), reviewed: true, years: [2023], fingerprints: ['current'] } });
    await TestBed.configureTestingModule({ imports: [AccountReportsModule], providers: [provideRouter([]),
      { provide: AccountReportWorkbenchContext, useValue: { workspace, report: computed(() => workspace.accountReports()[0]) } },
      { provide: BetterPlantsReportService, useValue: { state, checksRoute: () => ['/checks'] } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(BetterPlantsPreviewComponent); fixture.detectChanges();
    return { fixture, state, workspace };
  }
  it.each(['energy', 'water'] as const)('renders the official-form %s content and baseline/report comparison', async category => {
    const { fixture } = await setup(category);
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('assets/images/better-plants-report-banner.jpg');
    expect(fixture.nativeElement.querySelectorAll('table').length).toBeGreaterThanOrEqual(3);
    expect(fixture.nativeElement.textContent).toContain(category === 'water' ? 'Water Consumed (kGal)' : 'Energy Consumed (MMBtu)');
    expect(fixture.nativeElement.textContent).toContain('Baseline Year'); expect(fixture.nativeElement.textContent).toContain('Report Year');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
  it('removes rendered values when review becomes required and offers the checks destination', async () => {
    const { fixture, state } = await setup();
    state.set({ key: 'view', state: 'review-required', message: 'Review required.' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeNull(); expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/checks');
  });
});

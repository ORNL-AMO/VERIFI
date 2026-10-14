import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchHeaderComponent, accountAnalysisResultOutcome } from './account-analysis-workbench-header.component';
import { AccountAnalysisAutosaveService, AccountAnalysisAutosaveState } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisResultsService, AccountAnalysisResultState } from '../results/calculation/account-analysis-results.service';
import { analysisOutcomeDisplay, analysisOutcomeSummary } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { projectAccountAnalysisDashboardResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import { AccountAnalysisSelectionCounts } from '../../account-analysis-dashboard/account-analysis.models';

function readyState(): Extract<AccountAnalysisResultState, { state: 'ready' }> {
  return {
    state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', reportYear: 2025,
    annual: [{ year: 2025, totalSavingsPercentImprovement: 8.756 }] as any,
    monthly: [{ date: new Date(2026, 0, 1), rolling12MonthImprovement: 7.5 }] as any,
    facilitySummaries: []
  };
}

function configureHeader() {
  const expanded = signal(true);
  const analysis = signal({
    guid: 'analysis-a', name: 'Portfolio Energy', analysisCategory: 'energy', baselineYear: 2020,
    energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal'
  });
  const results = signal<AccountAnalysisResultState>(readyState());
  const saveState = signal<AccountAnalysisAutosaveState>('saved');
  const findings = signal<StatusItem[]>([{
    id: 'warning-a', code: 'account-analysis.children.warning', severity: 'warning', category: 'readiness',
    entity: { name: 'Analysis A', kind: 'account-analysis', guid: 'analysis-a', accountGuid: 'account-a' },
    evidence: {}, title: 'Review facility analyses', description: 'Included analyses have warnings.', todo: true,
    destination: { kind: 'account-analysis', accountGuid: 'account-a', analysisGuid: 'analysis-a' }
  }]);
  const linkedReports = signal([{ guid: 'report-a' }]);
  const selectionCounts = signal<AccountAnalysisSelectionCounts>({ included: 2, skipped: 1, missing: 1, invalid: 1 });
  const navigateTo = vi.fn();
  const flush = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    imports: [AccountAnalysisWorkbenchHeaderComponent],
    providers: [
      provideRouter([]),
      { provide: WorkspaceNavigationService, useValue: {
        accountPortfolioRoute: (accountGuid: string, tab: string) => ['/v1', 'workspace', 'account', accountGuid, 'data', 'portfolio', tab],
        accountAnalysisRoute: (accountGuid: string) => ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'dashboard'],
        accountAnalysisWorkbenchRoute: (accountGuid: string, analysisGuid: string, tab = 'setup') => ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, tab]
      } },
      { provide: AccountAnalysisWorkbenchContext, useValue: {
        account: signal({ guid: 'account-a', name: 'Account A', fiscalYear: 'calendarYear' }),
        analysis, analyses: signal([analysis()]),
        status: { state: signal('ready'), navigateTo }, hasBlockingErrors: signal(false), findings,
        isActiveForReporting: signal(true), selectionCounts, linkedReports
      } },
      { provide: AccountAnalysisWorkbenchNavigationService, useValue: { currentStageFindings: signal([]) } },
      { provide: AccountAnalysisAutosaveService, useValue: {
        draft: analysis, state: saveState, error: signal(undefined), flush, retry: vi.fn(), discard: vi.fn()
      } },
      { provide: AccountAnalysisResultsService, useValue: { state: results } },
      { provide: WorkbenchLayoutService, useValue: {
        factsExpanded: expanded.asReadonly(), toggleFacts: () => expanded.update(value => !value)
      } }
    ]
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AccountAnalysisWorkbenchHeaderComponent);
  fixture.detectChanges();
  return { fixture, expanded, analysis, results, saveState, findings, linkedReports, selectionCounts, navigateTo, flush, navigate };
}

describe('AccountAnalysisWorkbenchHeaderComponent', () => {
  it('renders the five dashboard facts and keeps status and dependencies visible with facts collapsed', () => {
    const { fixture } = configureHeader();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('dl > div')).toHaveLength(5);
    expect(host.textContent).toContain('Latest full year · 2025');
    expect(host.textContent).toContain('8.76%');
    expect(host.textContent).toContain('Latest month · Jan 2026');
    expect(host.textContent).toContain('7.5%');
    expect(host.textContent).toContain('Site energy · MMBtu');
    expect(host.textContent).toContain('2 included · 3 need attention');
    expect(host.textContent).toContain('Active for reporting');
    const dependencyNote = host.querySelector('[aria-label="Downstream dependencies"] span');
    expect(dependencyNote?.textContent).toBe('Changes can affect 1 report.');
    expect(host.querySelector('[aria-label="Downstream dependencies"] a')).toBeNull();
    host.querySelector<HTMLButtonElement>('[aria-controls="v1-account-analysis-workbench-facts"]')?.click();
    fixture.detectChanges();
    expect(host.querySelector<HTMLElement>('#v1-account-analysis-workbench-facts')?.hidden).toBe(true);
    expect(dependencyNote?.closest('[hidden]')).toBeNull();
    const notes = host.querySelector('app-analysis-status-notes');
    expect(notes?.closest('[hidden]')).toBeNull();
    expect(notes?.textContent).toContain('Included analyses have warnings.');
    expect(notes?.querySelector('button, a')).toBeNull();
  });

  it('updates dependencies and selection facts as the workspace changes', () => {
    const { fixture, linkedReports, selectionCounts } = configureHeader();
    linkedReports.set([{ guid: 'report-a' }, { guid: 'report-b' }]);
    selectionCounts.set({ included: 3, skipped: 0, missing: 0, invalid: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Changes can affect 2 reports.');
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain('3 included');
    expect(fixture.nativeElement.querySelector('dl').textContent).not.toContain('need attention');
    linkedReports.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Downstream dependencies"]')).toBeNull();
  });

  it('clears old outcomes immediately for unsaved drafts and a different selected analysis', async () => {
    const { fixture, analysis, saveState, results } = configureHeader();
    saveState.set('dirty');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dl').textContent).not.toContain('8.76%');
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain('Waiting for save…');
    saveState.set('saved');
    analysis.set({ ...analysis(), guid: 'analysis-b', name: 'Other analysis' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dl').textContent).not.toContain('8.76%');
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain('Preparing data…');
    results.set({ ...readyState(), analysisGuid: 'analysis-b' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain('8.76%');
  });

  it('flushes autosave before switching analyses and preserves the current analysis when flush fails', async () => {
    const { fixture, flush, navigate } = configureHeader();
    await fixture.componentInstance.switchAnalysis('analysis-b');
    expect(flush).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-b', 'setup']);
    navigate.mockClear();
    flush.mockResolvedValue(false);
    await fixture.componentInstance.switchAnalysis('analysis-c');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('account analysis header outcome projection', () => {
  it.each([
    ['energy', 'calendarYear', 0, false],
    ['energy', 'nonCalendarYear', -3.4567, false],
    ['water', 'calendarYear', 12.3456, false],
    ['water', 'nonCalendarYear', 7.89, true]
  ] as const)('matches dashboard outcomes for %s, %s, %s and incomplete=%s', (category, fiscalYear, value, incomplete) => {
    const state = readyState();
    const annual = [
      { year: 2025, totalSavingsPercentImprovement: value, missingPredictorValue: incomplete },
      { year: 2026, totalSavingsPercentImprovement: 999 }
    ] as any;
    const monthly = [
      { date: new Date(2025, 11, 1), rolling12MonthImprovement: 99 },
      { date: new Date(2026, 0, 1), rolling12MonthImprovement: value, missingValueWarning: incomplete }
    ] as any;
    const dashboard = projectAccountAnalysisDashboardResults({
      itemId: state.analysisGuid, annualAnalysisSummaries: annual,
      monthlyAnalysisSummaryData: monthly, reportYear: state.reportYear
    });
    const actual = analysisOutcomeDisplay(accountAnalysisResultOutcome({ ...state, annual, monthly }, 'saved', false, { fiscalYear }, 'analysis-a'), category);
    const expected = analysisOutcomeDisplay({ state: 'ready', summary: analysisOutcomeSummary(
      dashboard.annualAnalysisSummaries, dashboard.monthlyAnalysisSummaryData, dashboard.reportYear, { fiscalYear }
    ) }, category);
    expect(actual).toEqual(expected);
    expect(actual.annual.metaLabel).toBe(`Total ${category === 'water' ? 'consumption' : 'energy'} improvement`);
  });

  it('shows missing periods and non-finite improvements as unavailable', () => {
    const state = { ...readyState(), annual: [], monthly: [] };
    const display = analysisOutcomeDisplay(accountAnalysisResultOutcome(state, 'saved', false, undefined, 'analysis-a'), 'energy');
    expect(display.annual.valueLabel).toBe('No complete year');
    expect(display.monthly.valueLabel).toBe('No complete month');
    const nonFinite = readyState();
    const annual = [{ year: 2025, totalSavingsPercentImprovement: NaN }] as any;
    expect(analysisOutcomeDisplay(accountAnalysisResultOutcome({ ...nonFinite, annual }, 'saved', false, undefined, 'analysis-a'), 'energy').annual.valueLabel).toBe('Unavailable');
  });

  it.each([
    [{ state: 'loading', analysisGuid: 'analysis-a', fingerprint: 'a' }, 'saved', false, 'Calculating…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'workspace' }, 'saved', false, 'Preparing data…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'status' }, 'saved', false, 'Preparing data…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'autosave' }, 'saving', false, 'Waiting for save…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'blocked' }, 'saved', false, 'Setup incomplete'],
    [readyState(), 'invalid', false, 'Setup incomplete'],
    [readyState(), 'saved', true, 'Setup incomplete'],
    [readyState(), 'error', false, 'Save failed'],
    [{ state: 'error', analysisGuid: 'analysis-a', fingerprint: 'a', message: 'failed' }, 'saved', false, 'Calculation failed']
  ] as const)('projects unavailable result states without keeping old values', (state, autosaveState, blocking, message) => {
    const display = analysisOutcomeDisplay(accountAnalysisResultOutcome(state, autosaveState, blocking, undefined, 'analysis-a'), 'energy');
    expect(display.annual.valueLabel).toBe(message);
    expect(display.monthly.valueLabel).toBe(message);
  });
});

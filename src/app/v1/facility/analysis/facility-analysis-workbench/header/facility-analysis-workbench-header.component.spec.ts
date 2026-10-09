import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisResultsService } from '../results/calculation/facility-analysis-results.service';
import {
  FacilityAnalysisWorkbenchHeaderComponent,
  facilityAnalysisDependencyMessage,
  facilityAnalysisResultOutcome
} from './facility-analysis-workbench-header.component';

describe('facility analysis workbench header', () => {
  it('projects the report-year savings improvement into the header facts', () => {
    expect(facilityAnalysisResultOutcome({
      state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', reportYear: 2025,
      annual: [
        { year: 2024, totalSavingsPercentImprovement: 4.2 },
        { year: 2025, totalSavingsPercentImprovement: 8.75 }
      ] as any,
      monthly: [{ date: new Date(2026, 0, 1), rolling12MonthImprovement: 7.5 } as any], groups: []
    }, 'saved', false, { fiscalYear: 'calendarYear' } as any)).toEqual({
      state: 'ready',
      summary: {
        annual: { periodLabel: '2025', value: 8.75 },
        monthly: { periodLabel: 'Jan 2026', value: 7.5 }
      }
    });
  });

  it.each([
    [{ state: 'loading', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-b' }, 'saved', false, 'Calculating…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'calendarization' }, 'saved', false, 'Preparing data…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'autosave' }, 'saving', false, 'Waiting for save…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'autosave' }, 'invalid', false, 'Setup incomplete'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'blocked' }, 'saved', false, 'Setup incomplete'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'status' }, 'saved', true, 'Setup incomplete'],
    [{ state: 'error', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-b', message: 'failed' }, 'saved', false, 'Calculation failed']
  ] as const)('reports the result fact state without implying blocked work is calculating', (state, autosaveState, hasBlockingErrors, message) => {
    expect(facilityAnalysisResultOutcome(state, autosaveState, hasBlockingErrors)).toEqual({
      state: message === 'Setup incomplete' ? 'blocked' : message === 'Calculation failed' ? 'error' : 'loading',
      message
    });
  });

  it('summarizes downstream dependency counts with natural singular and plural labels', () => {
    expect(facilityAnalysisDependencyMessage(0, 0, 0)).toBeUndefined();
    expect(facilityAnalysisDependencyMessage(1, 0, 0)).toBe('Changes can affect 1 account analysis.');
    expect(facilityAnalysisDependencyMessage(2, 1, 3)).toBe(
      'Changes can affect 2 account analyses, 1 report, and 3 banking consumers.'
    );
  });

  it('renders outcomes and group equations inside the shared collapsible facts region', async () => {
    const analysis = {
      guid: 'analysis-a', facilityId: 'facility-a', name: 'Energy analysis', analysisCategory: 'energy',
      baselineYear: 2022, energyIsSource: false, energyUnit: 'MMBtu', groups: [{
        idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: []
      }]
    } as any;
    const factsExpanded = signal(true);
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchHeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            facility: signal({ guid: 'facility-a', name: 'Facility A', fiscalYear: 'nonCalendarYear' }),
            analysis: signal(analysis), analyses: signal([analysis]),
            meterGroups: signal([{ guid: 'group-a', name: 'Electricity' }]),
            hasBlockingErrors: signal(false),
            workspace: { accountAnalyses: signal([]), selectedFacilityReports: signal([]) },
            status: { navigateTo: vi.fn() }
          }
        },
        {
          provide: FacilityAnalysisAutosaveService,
          useValue: {
            draft: signal(analysis), state: signal('saved'), error: signal(undefined),
            retry: vi.fn(), discard: vi.fn()
          }
        },
        {
          provide: FacilityAnalysisResultsService,
          useValue: { state: signal({
            state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', reportYear: 2025,
            annual: [{ year: 2025, totalSavingsPercentImprovement: 8.75 }],
            monthly: [{ date: new Date(2026, 8, 1), rolling12MonthImprovement: 7.9 }],
            groups: []
          }) }
        },
        {
          provide: FacilityAnalysisWorkbenchNavigationService,
          useValue: { currentStageFindings: signal([]) }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountPortfolioRoute: (accountGuid: string, tab: string) => ['/account', accountGuid, 'data', 'portfolio', tab],
            facilityAnalysisRoute: (facilityGuid: string) => ['/facility', facilityGuid, 'analyses'],
            facilityAnalysisWorkbenchRoute: (facilityGuid: string, analysisGuid: string) => [
              '/facility', facilityGuid, 'analysis', analysisGuid
            ]
          }
        },
        {
          provide: WorkbenchLayoutService,
          useValue: {
            factsExpanded: factsExpanded.asReadonly(),
            toggleFacts: () => factsExpanded.update(expanded => !expanded)
          }
        }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchHeaderComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const breadcrumbs = Array.from<HTMLAnchorElement>(host.querySelectorAll('.v1-data-workbench-breadcrumb a'));

    expect(breadcrumbs.map(link => link.textContent?.trim())).toEqual(['Account A', 'Facility A', 'Analyses']);
    expect(breadcrumbs.map(link => link.getAttribute('href'))).toEqual([
      '/account/account-a/data/portfolio/analyses',
      '/facility/facility-a/analyses',
      '/facility/facility-a/analyses'
    ]);
    expect(host.textContent).toContain('Latest full year · FY 2025');
    expect(host.textContent).toContain('8.75%');
    expect(host.textContent).toContain('Latest month · Sep 2026');
    expect(host.textContent).toContain('Electricity');
    expect(host.textContent).toContain('Modeled energy = baseline-period actual consumption');

    const toggle = Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Hide facts'));
    if (!toggle) throw new Error('Facts toggle not found');
    toggle.click();
    fixture.detectChanges();

    expect(host.querySelector<HTMLElement>('#v1-analysis-workbench-facts')?.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

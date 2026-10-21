import { analysisDependencyMessage as facilityAnalysisDependencyMessage } from '@app/v1/shared/analysis-results/analysis-dependency-message';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisResultsService } from '../results/calculation/facility-analysis-results.service';
import { AccountAnalysisReturnService } from '../navigation/account-analysis-return.service';
import {
  FacilityAnalysisWorkbenchHeaderComponent,
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
    const findings = signal<StatusItem[]>([{
      id: 'group-warning', code: 'analysis-group.model.invalid', severity: 'warning', category: 'readiness',
      entity: { name: 'Analysis A', kind: 'analysis-group', guid: 'analysis-a:group-a', accountGuid: 'account-a', facilityGuid: 'facility-a' },
      evidence: {}, title: 'Review group model', description: 'Model needs review.', todo: true,
      destination: { kind: 'facility-analysis', facilityGuid: 'facility-a', analysisGuid: 'analysis-a', scope: 'group', groupGuid: 'group-a', tab: 'regression' }
    }]);
    const factsExpanded = signal(true);
    const singleSite = signal(false);
    const returnOrigin = signal({ accountGuid: 'account-a', accountAnalysisGuid: 'account-analysis-a', facilityGuid: 'facility-a' });
    const returnToAccountAnalysis = vi.fn();
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
            hasBlockingErrors: signal(false), findings,
            workspace: { accountAnalyses: signal([]), selectedFacilityReports: signal([]) },
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
          provide: AccountAnalysisReturnService,
          useValue: { origin: returnOrigin, returnToAccountAnalysis }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountAnalysisRoute: (accountGuid: string) => ['/account', accountGuid, 'analysis', 'dashboard'],
            isSingleSiteWorkspace: singleSite,
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
    const breadcrumbs = Array.from<HTMLAnchorElement>(host.querySelectorAll('app-page-identity nav a'));

    expect(breadcrumbs.map(link => link.textContent?.trim())).toEqual(['Account A', 'Facility A']);
    expect(breadcrumbs.map(link => link.getAttribute('href'))).toEqual([
      '/account/account-a/analysis/dashboard',
      '/facility/facility-a/analyses'
    ]);
    expect(host.textContent).toContain('Latest full year · FY 2025');
    expect(host.textContent).toContain('8.75%');
    expect(host.textContent).toContain('Latest month · Sep 2026');
    expect(host.textContent).toContain('Electricity');
    expect(host.textContent).toContain('Modeled energy = baseline-period actual consumption');
    const returnButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Return to Account Analysis'));
    expect(returnButton).toBeTruthy();
    returnButton?.click();
    expect(returnToAccountAnalysis).toHaveBeenCalledOnce();

    const toggle = Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Hide facts'));
    if (!toggle) throw new Error('Facts toggle not found');
    toggle.click();
    fixture.detectChanges();

    expect(host.querySelector<HTMLElement>('#v1-analysis-workbench-facts')?.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const statusNotes = host.querySelector('app-analysis-status-notes');
    expect(statusNotes?.closest('[hidden]')).toBeNull();
    expect(statusNotes?.textContent).toContain('Model needs review.');
    expect(statusNotes?.querySelector('button, a')).toBeNull();

    const groupWarning = findings()[0];
    const regressionFindings = ['group-a', 'group-b', 'group-c'].map((groupGuid, index) => presentFinding(makeFinding(
      'analysis-group.setup.invalid', 'error', 'readiness',
      { kind: 'analysis-group', guid: `analysis-a:${groupGuid}`, name: groupGuid, accountGuid: 'account-a', facilityGuid: 'facility-a' },
      { analysisType: 'regression', reasons: [index === 0 ? 'missingRegressionConstant' : 'missingRegressionPredictorCoef'] }
    )));
    findings.set([...regressionFindings, groupWarning]);
    fixture.detectChanges();

    expect(statusNotes?.querySelectorAll('li')).toHaveLength(2);
    expect(statusNotes?.textContent?.match(/Complete regression setup/g)).toHaveLength(1);
    expect(statusNotes?.textContent).toContain('3 groups need regression setup.');
    expect(statusNotes?.textContent).toContain('regression constant, predictor coefficients');
    expect(statusNotes?.textContent).toContain('Model needs review.');

    findings.set([regressionFindings[1], regressionFindings[2], groupWarning]);
    fixture.detectChanges();
    expect(statusNotes?.querySelectorAll('li')).toHaveLength(2);
    expect(statusNotes?.textContent).toContain('2 groups need regression setup.');

    findings.set([regressionFindings[2], groupWarning]);
    fixture.detectChanges();
    expect(statusNotes?.textContent).toContain(regressionFindings[2].description);
    expect(statusNotes?.textContent).not.toContain('groups need regression setup.');

    findings.set([]);
    fixture.detectChanges();
    expect(statusNotes?.querySelector('ul')).toBeNull();
    singleSite.set(true); fixture.detectChanges();
    expect(Array.from(host.querySelectorAll('app-page-identity nav a')).map(link => link.textContent?.trim())).toEqual(['Facility A']);
  });
});

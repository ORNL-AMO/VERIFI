import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { FacilityAnalysisDetailsResultsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-details-slideout/facility-analysis-details-results.service';
import { AccountAnalysisFacilitySelectionService } from './account-analysis-facility-selection.service';
import { AccountAnalysisSelectFacilityItemsComponent } from './account-analysis-select-facility-items.component';

describe('AccountAnalysisSelectFacilityItemsComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders facility progress, matching analysis details, skip control, and the report warning', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.v1-account-selection__heading')).toBeNull();
    expect(host.querySelector('.v1-account-selection')?.getAttribute('aria-label')).toBe('Select Facility Items');
    expect(host.textContent).toContain('1 / 1 valid');
    expect(host.textContent).toContain('Electricity plan');
    expect(host.textContent).toContain('Regression');
    expect(host.textContent).toContain('Jun 2025');
    expect(host.textContent).toContain('Skip this facility');
    expect(host.textContent).toContain('used in 1 report');
  });

  it('passes typed radio selections to the selection service', async () => {
    const { fixture, selection } = await setup();
    fixture.detectChanges();
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;

    radios[1].click();
    fixture.detectChanges();

    expect(selection.skipFacility).toHaveBeenCalledOnce();
  });

  it('saves skip for consecutive facilities after silent form hydration', async () => {
    const {
      fixture,
      selection,
      activeItem,
      activeFacility,
      activeFacilityGuid
    } = await setup();
    fixture.detectChanges();

    fixture.componentInstance.selectionControl.setValue('skip');
    expect(selection.skipFacility).toHaveBeenCalledTimes(1);

    const nextFacility = {
      ...activeFacility(),
      guid: 'facility-b',
      name: 'Facility B'
    };
    activeFacilityGuid.set(nextFacility.guid);
    activeFacility.set(nextFacility);
    activeItem.set({
      facility: nextFacility,
      analysisItemId: undefined,
      selectedAnalysis: undefined,
      eligible: false,
      assigned: false,
      state: 'unconfigured'
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.selectionControl.value).toBeNull();

    fixture.componentInstance.selectionControl.setValue('skip');
    expect(selection.skipFacility).toHaveBeenCalledTimes(2);
  });

  it('shows the locked-category creation slideout with generated defaults', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    const addButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Add Facility Analysis'));
    addButton?.click();
    fixture.detectChanges();

    const slideout = fixture.nativeElement.querySelector('app-create-facility-analysis-slideout') as HTMLElement;
    expect(slideout).toBeTruthy();
    expect(slideout.textContent).toContain('Energy');
    expect(slideout.textContent).toContain('Source energy');
    expect(slideout.textContent).toContain('Regression for each matching meter group');
  });

  it('opens analysis details from the monocle action before navigating to the full analysis', async () => {
    const { fixture, selection, detailsResults } = await setup();
    fixture.detectChanges();
    const viewButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(button => button.textContent?.includes('View Analysis'));

    expect(viewButton?.querySelector('app-ui-icon')?.getAttribute('name')).toBe('monocle');
    viewButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-analysis-details-slideout')).toBeTruthy();
    expect(detailsResults.open).toHaveBeenCalledWith('analysis-a');
    expect(fixture.nativeElement.textContent).toContain('12.5%');
    expect(fixture.nativeElement.textContent).toContain('Open full analysis');
    const openButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Open full analysis'));
    openButton?.click();
    await fixture.whenStable();

    expect(selection.openFacilityAnalysis).toHaveBeenCalledWith(selection.detailCards()[0].analysis);
  });
});

async function setup() {
  const facility = {
    guid: 'facility-a', name: 'Facility A', color: '#336699',
    sustainabilityQuestions: { energyReductionBaselineYear: 2022 }
  } as any;
  const accountAnalysis = {
    guid: 'account-analysis-a', analysisCategory: 'energy', energyIsSource: true,
    energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2022
  } as any;
  const candidate = {
    analysis: {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Electricity plan',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
      baselineYear: 2022, groups: [], modifiedDate: new Date(2026, 0, 1)
    },
    state: 'ready', badges: [], findings: [], dataThrough: new Date(2025, 5, 1),
    groups: [{ groupId: 'group-a', groupName: 'Electricity', analysisLabel: 'Regression' }]
  } as any;
  const item = {
    facility, analysisItemId: 'analysis-a', selectedAnalysis: candidate.analysis,
    eligible: true, assigned: true, state: 'ready'
  };
  const detailCard = {
    analysis: candidate.analysis, category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [],
    isActiveForReporting: false, linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [],
    dependencyCount: 0, modifiedDateLabel: 'Jan 1, 2026', modifiedSortValue: 1,
    searchText: 'electricity plan', attentionRank: 3
  } as any;
  const activeItem = signal<any>(item);
  const activeFacility = signal<any>(facility);
  const activeFacilityGuid = signal('facility-a');
  const selection = {
    selectionItems: signal([item]), activeItem, activeFacility,
    activeFacilityGuid, analysis: signal(accountAnalysis), assignedCount: signal(1), validCount: signal(1),
    candidates: signal([candidate]), selectedCandidate: signal(candidate), detailCards: signal([detailCard]), canMutate: signal(true),
    busy: signal(false), error: signal(undefined), selectFacility: vi.fn(), skipFacility: vi.fn(),
    selectAnalysis: vi.fn(), clearError: vi.fn(), createFacilityAnalysis: vi.fn(),
    openFacilityAnalysis: vi.fn(async () => true)
  };
  const detailsResults = {
    state: signal({
      state: 'ready', analysisGuid: 'analysis-a', annualAnalysisSummaries: [], reportYear: 2025,
      summary: {
        annual: { periodLabel: '2025', value: 12.5 },
        monthly: { periodLabel: 'Aug 2026', value: 8.25 }
      }
    }),
    open: vi.fn(),
    close: vi.fn()
  };
  TestBed.overrideComponent(AccountAnalysisSelectFacilityItemsComponent, {
    set: { providers: [{ provide: FacilityAnalysisDetailsResultsService, useValue: detailsResults }] }
  });
  await TestBed.configureTestingModule({
    imports: [AccountAnalysisSelectFacilityItemsComponent],
    providers: [
      { provide: AccountAnalysisFacilitySelectionService, useValue: selection },
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: {
          linkedReports: signal([{ guid: 'report-a' }]),
          status: { state: signal('ready') },
          workspace: { canWrite: signal(true), meterGroups: signal([]) }
        }
      }
    ]
  }).compileComponents();
  return {
    fixture: TestBed.createComponent(AccountAnalysisSelectFacilityItemsComponent),
    selection,
    detailsResults,
    activeItem,
    activeFacility,
    activeFacilityGuid
  };
}

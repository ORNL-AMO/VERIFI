import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '../../shell/modal-portal.service';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { AccountPortfolioModule } from './account-portfolio.module';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { PortfolioFacilityService } from './portfolio-facility.service';

describe('AccountPortfolioComponent', () => {
  let fixture: ComponentFixture<AccountPortfolioComponent>;
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let canWrite: ReturnType<typeof signal<boolean>>;
  let hasPending: ReturnType<typeof signal<boolean>>;
  let portfolioFacilities: { deleteFacility: ReturnType<typeof vi.fn>; createFacility: ReturnType<typeof vi.fn> };
  let navigation: {
    account: ReturnType<typeof signal<IdbAccount | undefined>>;
    openFacility: ReturnType<typeof vi.fn>;
    facilitySettingsRoute: ReturnType<typeof vi.fn>;
  };
  let workspaceService: { selectFacility: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let modalPortal: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    account = signal(accountFixture());
    facilities = signal([facilityFixture('facility-a', 'Alpha Plant'), facilityFixture('facility-b', 'Beta Works')]);
    canWrite = signal(true);
    hasPending = signal(false);
    portfolioFacilities = {
      deleteFacility: vi.fn(async () => undefined),
      createFacility: vi.fn(async () => facilityFixture('facility-new', 'New Facility'))
    };
    navigation = {
      account,
      openFacility: vi.fn(async () => undefined),
      facilitySettingsRoute: vi.fn((facilityGuid: string, detail = 'profile') => [
        '/v1',
        'workspace',
        'facility',
        facilityGuid,
        'settings',
        detail
      ])
    };
    workspaceService = { selectFacility: vi.fn() };
    router = { navigate: vi.fn(async () => true) };
    modalPortal = {
      show: vi.fn(),
      hide: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        AccountPortfolioModule
      ],
      providers: [
        SettingsFormService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            facilities,
            meters: signal([{ guid: 'meter-a', facilityId: 'facility-a', source: 'Electricity', modifiedDate: new Date('2026-02-01') }]),
            meterData: signal([{ guid: 'reading-a', facilityId: 'facility-a', modifiedDate: new Date('2026-02-02') }]),
            predictors: signal([
              { guid: 'predictor-a', facilityId: 'facility-a', predictorType: 'Standard', production: true },
              { guid: 'predictor-b', facilityId: 'facility-b', predictorType: 'Weather', production: false },
              { guid: 'predictor-c', facilityId: 'facility-b', predictorType: 'Standard', productionInAnalysis: true }
            ]),
            predictorData: signal([]),
            facilityAnalyses: signal([
              { guid: 'analysis-a', facilityId: 'facility-a', analysisCategory: 'energy', baselineYear: 2024, checked: true, isAnalysisVisited: true }
            ]),
            facilityReports: signal([
              { guid: 'report-a', facilityId: 'facility-a', facilityReportType: 'overview', checked: true },
              { guid: 'report-b', facilityId: 'facility-b', facilityReportType: 'analysis', checked: false },
              { guid: 'report-c', facilityId: 'facility-b', facilityReportType: 'dataQuality', checked: true }
            ]),
            energyUseEquipment: signal([
              {
                guid: 'equipment-a',
                facilityId: 'facility-a',
                equipmentType: 'Pump',
                utilityMeterGroupIds: ['meter-group-a'],
                noLongerInUse: { isNoLongerInUse: false, year: null }
              },
              {
                guid: 'equipment-b',
                facilityId: 'facility-b',
                equipmentType: 'HVAC',
                utilityMeterGroupIds: [],
                noLongerInUse: { isNoLongerInUse: false, year: null }
              },
              {
                guid: 'equipment-c',
                facilityId: 'facility-b',
                equipmentType: 'Lighting',
                utilityMeterGroupIds: [],
                noLongerInUse: { isNoLongerInUse: true, year: 2024 }
              }
            ]),
            canWrite,
            hasPending
          }
        },
        { provide: PortfolioFacilityService, useValue: portfolioFacilities },
        { provide: WorkspaceNavigationService, useValue: navigation },
        { provide: AccountWorkspaceService, useValue: workspaceService },
        { provide: ModalPortalService, useValue: modalPortal },
        { provide: Router, useValue: router }
      ]
    });
    fixture = TestBed.createComponent(AccountPortfolioComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders portfolio selectors and general facility details from workspace data', () => {
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Alpha Plant');
    expect(fixture.nativeElement.textContent).toContain('Beta Works');
    expect(selectorLabels()).toEqual(['Facilities', 'Meters', 'Predictors', 'Energy Uses', 'Analyses', 'Reports']);
    expect(selectorText()).not.toContain('Needs setup');
    expect(firstCardText()).toContain('Energy Uses');
    expect(firstCardText()).toContain('Reports');
    expect(firstCardText()).toContain('Last modified');
    expect(fixture.nativeElement.textContent).not.toContain('Uses account staleness');
    expect(fixture.nativeElement.textContent).not.toContain('MMBtu / kWh');
    expect(fixture.componentInstance.totals()).toEqual({
      facilities: 2,
      meters: 1,
      predictors: 3,
      energyUses: 3,
      analyses: 1,
      reports: 3
    });
  });

  it('filters facilities by search and setup status', () => {
    fixture.componentInstance.setSearch('beta');
    fixture.detectChanges();

    expect(cardTitles()).toEqual(['Beta Works']);

    fixture.componentInstance.setSearch('');
    fixture.componentInstance.setStatusFilter('noMeters');
    fixture.detectChanges();

    expect(cardTitles()).toEqual(['Beta Works']);
  });

  it('shows an empty state with add facility action', () => {
    facilities.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No facilities yet');
    buttonByText('Add facility').click();
    fixture.detectChanges();

    expect(modalPortal.show).toHaveBeenCalled();
    expect(fixture.componentInstance.isCreateFacilityDrawerOpen()).toBe(true);
  });

  it('changes facility card content when a portfolio selector is selected', () => {
    buttonByText('Meters').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedView()).toBe('meters');
    expect(fixture.nativeElement.textContent).toContain('Latest meter activity');
    expect(fixture.nativeElement.textContent).toContain('Add meters to begin utility data tracking');

    buttonByText('Predictors').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Weather');
    expect(fixture.nativeElement.textContent).toContain('Production');

    buttonByText('Energy Uses').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meter Links');
    expect(fixture.nativeElement.textContent).toContain('HVAC, Lighting');

    buttonByText('Analyses').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Baselines 2024');
    expect(fixture.nativeElement.textContent).toContain('Create analyses once utility data');

    buttonByText('Reports').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).toContain('Analysis, Data Quality');
  });

  it('sorts by the selected portfolio content count', () => {
    fixture.componentInstance.selectContentView('reports');
    fixture.componentInstance.setSortBy('selectedContent');
    fixture.detectChanges();

    expect(cardTitles()).toEqual(['Beta Works', 'Alpha Plant']);
  });

  it('opens the facility workspace and settings routes', () => {
    fixture.componentInstance.openFacility(facilities()[0]);
    fixture.componentInstance.openFacilitySettings(facilities()[1]);

    expect(navigation.openFacility).toHaveBeenCalledWith('facility-a');
    expect(workspaceService.selectFacility).toHaveBeenCalledWith('facility-b');
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-b',
      'settings',
      'profile'
    ]);
  });

  it('confirms before deleting a facility', async () => {
    const deleteButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button[aria-label="Delete facility"]'));

    deleteButtons[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete Alpha Plant?');
    expect(portfolioFacilities.deleteFacility).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmDeleteFacility();
    fixture.detectChanges();

    expect(portfolioFacilities.deleteFacility).toHaveBeenCalledWith(facilities()[0]);
    expect(fixture.nativeElement.textContent).toContain('Facility deleted');
  });

  it('disables write actions while workspace writes are unavailable', () => {
    canWrite.set(false);
    fixture.detectChanges();

    expect(buttonByText('Add facility').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Portfolio actions are unavailable');
  });

  function buttonByText(text: string): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(button => button.textContent?.includes(text))!;
  }

  function cardTitles(): string[] {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.v1-facility-card__title'))
      .map(button => button.textContent!.trim());
  }

  function firstCardText(): string {
    return fixture.nativeElement.querySelector('.v1-facility-card')!.textContent;
  }

  function selectorLabels(): string[] {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.v1-portfolio-selector'))
      .map(button => button.querySelector('span:not(.fa)')!.textContent!.trim());
  }

  function selectorText(): string {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-portfolio-selector'))
      .map(selector => selector.textContent)
      .join(' ');
  }
});

function accountFixture(): IdbAccount {
  return {
    ...getNewIdbAccount(),
    id: 1,
    guid: 'account-a',
    name: 'Account A'
  };
}

function facilityFixture(guid: string, name: string): IdbFacility {
  return {
    id: guid === 'facility-a' ? 1 : 2,
    guid,
    accountId: 'account-a',
    name,
    country: 'US',
    city: guid === 'facility-a' ? 'Oak Ridge' : 'Knoxville',
    state: 'TN',
    zip: '37830',
    address: '1 Main St',
    size: 10000,
    naics1: '',
    naics2: '',
    naics3: '',
    notes: '',
    unitsOfMeasure: 'Imperial',
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    massUnit: 'lb',
    volumeLiquidUnit: 'gal',
    volumeGasUnit: 'SCF',
    sustainabilityQuestions: getNewIdbAccount().sustainabilityQuestions,
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true,
    energyIsSource: true,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    color: '#123456',
    classification: guid === 'facility-a' ? 'Manufacturing' : 'Office',
    dataStalenessSettings: {
      enabled: true,
      thresholdMonths: 3,
      useAccountSettings: guid === 'facility-a'
    },
    createdDate: new Date('2026-01-01'),
    modifiedDate: new Date('2026-01-01')
  };
}

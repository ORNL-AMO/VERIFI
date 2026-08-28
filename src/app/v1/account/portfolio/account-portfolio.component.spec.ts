import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
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
            meters: signal([{ guid: 'meter-a', facilityId: 'facility-a', modifiedDate: new Date('2026-02-01') }]),
            meterData: signal([{ guid: 'reading-a', facilityId: 'facility-a', modifiedDate: new Date('2026-02-02') }]),
            predictors: signal([{ guid: 'predictor-a', facilityId: 'facility-a' }]),
            predictorData: signal([]),
            facilityAnalyses: signal([{ guid: 'analysis-a', facilityId: 'facility-a' }]),
            facilityReports: signal([{ guid: 'report-a', facilityId: 'facility-a' }]),
            energyUseEquipment: signal([{ guid: 'equipment-a', facilityId: 'facility-a' }]),
            canWrite,
            hasPending
          }
        },
        { provide: PortfolioFacilityService, useValue: portfolioFacilities },
        { provide: WorkspaceNavigationService, useValue: navigation },
        { provide: AccountWorkspaceService, useValue: workspaceService },
        { provide: Router, useValue: router }
      ]
    });
    fixture = TestBed.createComponent(AccountPortfolioComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders portfolio totals and facility details from workspace data', () => {
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Alpha Plant');
    expect(fixture.nativeElement.textContent).toContain('Beta Works');
    expect(fixture.nativeElement.textContent).toContain('Uses account staleness');
    expect(fixture.componentInstance.totals()).toEqual({
      facilities: 2,
      meters: 1,
      predictors: 1,
      analyses: 1,
      reports: 1,
      attention: 1
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

    expect(fixture.nativeElement.querySelector('app-create-portfolio-facility-drawer')).not.toBeNull();
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

    expect(fixture.nativeElement.textContent).toContain('Delete Beta Works?');
    expect(portfolioFacilities.deleteFacility).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmDeleteFacility();
    fixture.detectChanges();

    expect(portfolioFacilities.deleteFacility).toHaveBeenCalledWith(facilities()[1]);
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

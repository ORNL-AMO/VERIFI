import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { PortfolioFacilityService } from './portfolio-facility.service';

describe('AccountPortfolioComponent', () => {
  let fixture: ComponentFixture<AccountPortfolioComponent>;
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let canWrite: ReturnType<typeof signal<boolean>>;
  let hasPending: ReturnType<typeof signal<boolean>>;
  let portfolioFacilities: { deleteFacility: ReturnType<typeof vi.fn>; createFacility: ReturnType<typeof vi.fn> };
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
    modalPortal = {
      show: vi.fn(),
      hide: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        AccountDataModule
      ],
      providers: [
        SettingsFormService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            facilities,
            meters: signal([{ guid: 'meter-a', facilityId: 'facility-a', source: 'Electricity', name: 'Main Electric' }]),
            meterData: signal([{ guid: 'reading-a', facilityId: 'facility-a', meterId: 'meter-a', month: 1, year: 2026 }]),
            meterGroups: signal([]),
            predictors: signal([
              { guid: 'predictor-a', facilityId: 'facility-a' },
              { guid: 'predictor-b', facilityId: 'facility-b' }
            ]),
            predictorData: signal([]),
            facilityAnalyses: signal([{ guid: 'analysis-a', facilityId: 'facility-a' }]),
            facilityReports: signal([{ guid: 'report-a', facilityId: 'facility-a' }]),
            energyUseEquipment: signal([{ guid: 'equipment-a', facilityId: 'facility-a' }]),
            canWrite,
            hasPending
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            openFacility: vi.fn(async () => undefined),
            facilitySettingsRoute: (facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail],
            facilityDataRoute: (facilityGuid: string, detail = 'meters') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail],
            facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab]
          }
        },
        { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
        { provide: PortfolioFacilityService, useValue: portfolioFacilities },
        { provide: ModalPortalService, useValue: modalPortal },
        { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn() } },
        { provide: MeterCommandHandler, useValue: {} },
        { provide: MeterGroupCommandHandler, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(AccountPortfolioComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the portfolio shell and delegates the default content to the facilities tab', () => {
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(selectorLabels()).toEqual(['Facilities', 'Meters', 'Predictors', 'Energy Uses', 'Analyses', 'Reports']);
    expect(fixture.componentInstance.portfolioSelectors().find(selector => selector.path === 'meters')?.total).toBe(1);
    expect(fixture.componentInstance.portfolioSelectors().find(selector => selector.path === 'predictors')?.total).toBe(2);
    expect(fixture.componentInstance.portfolioSelectors().map(selector => selector.path)).toEqual([
      'facilities',
      'meters',
      'predictors',
      'energy-uses',
      'analyses',
      'reports'
    ]);
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(buttonByText('Add facility').classList.contains('v1-btn--action')).toBe(true);
  });

  it('renders selector links for each routed portfolio tab', () => {
    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a.v1-portfolio-selector'));

    expect(links.length).toBe(6);
    expect(links[0].querySelector('.v1-portfolio-selector__label')?.textContent?.trim()).toBe('Facilities');
    expect(links[0].querySelector('.v1-portfolio-selector__count app-ui-icon')).not.toBeNull();
    expect(links[0].querySelector('.v1-portfolio-selector__count strong')?.textContent?.trim()).toBe('2');
    expect(fixture.componentInstance.portfolioSelectors().map(selector => selector.path)).toEqual([
      'facilities',
      'meters',
      'predictors',
      'energy-uses',
      'analyses',
      'reports'
    ]);
  });

  it('shows a shell-level empty state when the account has no facilities', () => {
    facilities.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No facilities');
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();

    buttonByText('Add facility').click();
    fixture.detectChanges();

    expect(modalPortal.show).toHaveBeenCalled();
    expect(fixture.componentInstance.isCreateFacilityDrawerOpen()).toBe(true);
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

  function selectorLabels(): string[] {
    return Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('.v1-portfolio-selector'))
      .map(link => link.querySelector('span')!.textContent!.trim());
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
    classification: guid === 'facility-a' ? 'Manufacturing' : 'Office',
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal',
    modifiedDate: new Date('2026-01-01')
  } as IdbFacility;
}

import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { DataModule } from '@app/v1/data/data.module';
import { DataInventoryComponent } from './data-inventory.component';
import { FacilityActionsService } from '@app/v1/data/facilities/facility-actions.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { InventoryHeaderActionsRegistry } from './inventory-header-actions.service';

describe('DataInventoryComponent', () => {
  let fixture: ComponentFixture<DataInventoryComponent>;
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let canWrite: ReturnType<typeof signal<boolean>>;
  let hasPending: ReturnType<typeof signal<boolean>>;
  let portfolioFacilities: { deleteFacility: ReturnType<typeof vi.fn>; createFacility: ReturnType<typeof vi.fn> };
  const activePortfolioTab = signal('facilities');
  let modalPortal: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    activePortfolioTab.set('facilities');
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
        DataModule
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
            accountAnalyses: signal([{ guid: 'account-analysis-a' }]),
            facilityReports: signal([{ guid: 'report-a', facilityId: 'facility-a' }]),
            energyUseEquipment: signal([{ guid: 'equipment-a', facilityId: 'facility-a' }]),
            canWrite,
            hasPending
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: { isSingleSiteWorkspace: () => false,
            activePortfolioTab, uploadQuery: () => ({}), inventoryFacilityGuid: signal<string | undefined>(undefined), changeFacilityScope: vi.fn(),
            openFacility: vi.fn(async () => undefined),
            accountSettingsRoute: (accountGuid: string, detail = 'profile') => ['/v1', 'workspace', 'account', accountGuid, 'settings', detail],
            facilitySettingsRoute: (facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail],
            facilityDataToolRoute: (facilityGuid: string, detail = 'meters') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail],
            facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab],
            facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab],
            facilityWeatherPredictorCreateRoute: (facilityGuid: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', 'weather', 'new']
          }
        },
        { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
        { provide: FacilityActionsService, useValue: portfolioFacilities },
        { provide: ModalPortalService, useValue: modalPortal },
        { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn() } },
        { provide: MeterCommandHandler, useValue: {} },
        { provide: MeterGroupCommandHandler, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(DataInventoryComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates the header toggle through the current typed registration and ignores other resource owners', () => {
    activePortfolioTab.set('meters'); fixture.detectChanges();
    const registry = fixture.debugElement.injector.get(InventoryHeaderActionsRegistry);
    const selecting = signal(false), available = signal(true);
    const toggle = vi.fn(() => selecting.update(value => !value));
    const unregister = registry.register({ resource: 'meters', selecting: selecting.asReadonly(), canToggle: available.asReadonly(), toggleSelection: toggle });
    fixture.detectChanges();
    const button = buttonByText('Select meters');
    expect(button.disabled).toBe(false);
    button.click(); fixture.detectChanges();
    expect(toggle).toHaveBeenCalledOnce(); expect(button.getAttribute('aria-pressed')).toBe('true');
    available.set(false); fixture.detectChanges(); expect(button.disabled).toBe(true);
    available.set(true); activePortfolioTab.set('predictors'); fixture.detectChanges();
    expect(buttonByText('Select predictors').disabled).toBe(true);
    unregister(); fixture.detectChanges(); expect(fixture.componentInstance.selectionActions()).toBeUndefined();
    activePortfolioTab.set('facilities'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Select facilities');
  });

  it('shows account and selected-facility breadcrumbs and clears scope through the account action', () => {
    const navigation = TestBed.inject(WorkspaceNavigationService);
    (navigation.inventoryFacilityGuid as WritableSignal<string | undefined>).set('facility-b'); fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('header .page-identity__crumb')].map((item: HTMLElement) => item.textContent.trim())).toEqual(['Account A', 'Beta Works']);
    fixture.nativeElement.querySelector('header .page-identity__crumb button').click();
    expect(navigation.changeFacilityScope).toHaveBeenCalledWith({ kind: 'all' });
  });

  it('renders the portfolio shell and delegates the default content to the facilities tab', () => {
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Facilities');
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Facilities');
    expect(fixture.nativeElement.querySelector('header .page-identity__crumb').textContent).toBe('Account A');
    account.set({ ...account()!, name: 'Another Account' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Facilities');
    expect(fixture.nativeElement.querySelector('header .page-identity__crumb').textContent).toBe('Another Account');
    expect(fixture.nativeElement.querySelector('header .page-identity__crumb').title).toBe('Another Account');
    expect(fixture.debugElement.query(By.css('h1 app-ui-icon')).componentInstance.name).toBe('facility');
    expect(fixture.nativeElement.querySelector('[aria-label="Portfolio content"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Upload data');
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(buttonByText('Add facility').classList.contains('v1-btn--action')).toBe(true);
  });

  it('puts facility settings in the header and changes available actions with the current content', () => {
    const settings = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'))
      .find(link => link.textContent?.trim() === 'Manage Portfolio')!;
    expect(settings.closest('.v1-account-portfolio__header-actions')).not.toBeNull();
    expect(settings.getAttribute('href')).toContain('/account/account-a/settings/portfolio');
    activePortfolioTab.set('meters');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Manage Portfolio');
    expect(fixture.nativeElement.textContent).not.toContain('Add facility');
    expect(fixture.nativeElement.textContent).toContain('Upload data');
    expect(buttonByText('Add meter').disabled).toBe(false);
    const validation = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'))
      .find(link => link.textContent?.trim() === 'Data Validation')!;
    expect(validation.getAttribute('href')).toContain('/account/account-a/settings/data-validation');

  });

  it.each(['meters', 'predictors'])('opens Data Validation settings for the selected scope from %s', tab => {
    activePortfolioTab.set(tab);
    const scope = TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as WritableSignal<string | undefined>;
    for (const facilityGuid of [undefined, 'facility-a', 'facility-b', undefined]) {
      scope.set(facilityGuid); fixture.detectChanges();
      const link = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'))
        .find(item => item.textContent?.trim() === 'Data Validation')!;
      expect(link.getAttribute('href')).toBe(facilityGuid
        ? `/v1/workspace/facility/${facilityGuid}/settings/data-validation`
        : '/v1/workspace/account/account-a/settings/data-validation');
    }
  });

  it('uses the active resource title for every portfolio destination', () => {
    for (const [tab, [title, icon]] of Object.entries({ facilities: ['Facilities', 'facility'], meters: ['Meters', 'meter'], predictors: ['Predictors', 'predictor'], 'energy-uses': ['Energy Uses', 'tools'] })) {
      activePortfolioTab.set(tab);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe(title);
      expect(fixture.debugElement.query(By.css('h1 app-ui-icon')).componentInstance.name).toBe(icon);
    }
  });

  it('opens the meter portal, guards writes, and closes it when the page or account changes', () => {
    activePortfolioTab.set('meters');
    fixture.detectChanges();
    buttonByText('Add meter').click();
    expect(modalPortal.show).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.isCreateMeterDrawerOpen()).toBe(true);
    activePortfolioTab.set('predictors');
    fixture.detectChanges();
    expect(fixture.componentInstance.isCreateMeterDrawerOpen()).toBe(false);
    activePortfolioTab.set('meters');
    fixture.detectChanges();
    buttonByText('Add meter').click();
    account.set({ ...account()!, guid: 'account-b' });
    fixture.detectChanges();
    expect(fixture.componentInstance.isCreateMeterDrawerOpen()).toBe(false);
    for (const blocked of ['read-only', 'pending', 'no-facilities']) {
      canWrite.set(blocked !== 'read-only');
      hasPending.set(blocked === 'pending');
      facilities.set(blocked === 'no-facilities' ? [] : [facilityFixture('facility-a', 'Alpha')]);
      fixture.detectChanges();
      expect(buttonByText('Add meter').disabled).toBe(true);
      fixture.componentInstance.openCreateMeterDrawer();
      expect(fixture.componentInstance.isCreateMeterDrawerOpen()).toBe(false);
    }
  });

  it('opens the created meter settings and reports navigation failure without another creation', async () => {
    activePortfolioTab.set('meters'); fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const meter = { guid: 'meter-new', facilityId: 'facility-b', accountId: 'account-a' } as any;
    fixture.componentInstance.openCreateMeterDrawer();
    await fixture.componentInstance.openCreatedMeter(meter);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-b', 'data', 'meters', 'meter-new', 'settings']);
    navigate.mockResolvedValue(false);
    fixture.componentInstance.openCreateMeterDrawer();
    await fixture.componentInstance.openCreatedMeter(meter);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Meter added. Its settings could not be opened');
  });

  it('closes a completed facility drawer before opening Settings and releases its leave registration', async () => {
    const parent = fixture.componentInstance;
    const changes = TestBed.inject(UnsavedChangesService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async () => {
      expect(parent.isCreateFacilityDrawerOpen()).toBe(false);
      expect(changes.confirmDiscard()).toBe(true);
      return true;
    });
    parent.openCreateFacilityDrawer();
    expect(changes.confirmDiscard()).toBe(false);
    await parent.openCreatedFacility(facilityFixture('facility-new', 'Created plant'));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/v1', 'workspace', 'facility', 'facility-new', 'settings', 'profile']);
    expect(parent.meterNavigationError()).toBe('');
  });

  it('hands off the first Facility after publication resolves a single-site account scope', async () => {
    const parent = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const scope = TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as WritableSignal<string | undefined>;
    account.set({ ...account()!, isSingleFacilityCompany: true }); facilities.set([]); fixture.detectChanges();
    parent.openCreateFacilityDrawer();
    const created = facilityFixture('first-facility', 'First plant');
    facilities.set([created]); scope.set(created.guid); fixture.detectChanges();
    expect(parent.isCreateFacilityDrawerOpen()).toBe(true);
    await parent.openCreatedFacility(created);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/v1', 'workspace', 'facility', created.guid, 'settings', 'profile']);
    expect(parent.isCreateFacilityDrawerOpen()).toBe(false);
  });

  it.each(['cancelled', 'rejected'] as const)('reports %s facility navigation after commit and keeps the creation drawer closed', async outcome => {
    const parent = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    if (outcome === 'cancelled') navigate.mockResolvedValue(false);
    else navigate.mockRejectedValue(new Error('Router failed'));
    parent.openCreateFacilityDrawer();
    await parent.openCreatedFacility(facilityFixture('facility-new', 'Created plant'));
    expect(parent.isCreateFacilityDrawerOpen()).toBe(false);
    expect(parent.meterNavigationError()).toContain('Facility added.');
    expect(portfolioFacilities.createFacility).not.toHaveBeenCalled();
  });

  it('ignores drawer results after their inventory scope changes, including before effects render', async () => {
    activePortfolioTab.set('meters'); fixture.detectChanges();
    const parent = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const scope = TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as WritableSignal<string | undefined>;
    parent.openCreateMeterDrawer();
    scope.set('facility-b');
    await parent.openCreatedMeter({ guid: 'created', accountId: 'account-a', facilityId: 'facility-a' } as IdbUtilityMeter);
    expect(navigate).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(parent.isCreateMeterDrawerOpen()).toBe(false);
  });

  it('does not publish a late handoff error after its Data parent is destroyed', async () => {
    const parent = fixture.componentInstance;
    let fail!: (error: Error) => void;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    parent.openCreateFacilityDrawer();
    const opening = parent.openCreatedFacility(facilityFixture('facility-new', 'Created plant'));
    fixture.destroy(); fail(new Error('Late route failure')); await opening;
    expect(parent.meterNavigationError()).toBe('');
  });

  it('shows the empty Data portfolio when there are no facilities, even with saved analyses', () => {
    facilities.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No facilities');
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('updates the routed-toolbar offset after header resizing and releases its observer', () => {
    let resized: ResizeObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { resized = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 180 } as DOMRect);
    const resizedFixture = TestBed.createComponent(DataInventoryComponent);
    try {
      resizedFixture.detectChanges();
      expect(resizedFixture.nativeElement.querySelector('.v1-account-portfolio').style.getPropertyValue('--portfolio-sticky-height')).toBe('180px');
      expect(observe).toHaveBeenCalled();
      bounds.mockReturnValue({ height: 220 } as DOMRect);
      resized!([], {} as ResizeObserver);
      expect(resizedFixture.nativeElement.querySelector('.v1-account-portfolio').style.getPropertyValue('--portfolio-sticky-height')).toBe('220px');
      bounds.mockReturnValue({ height: 217.8 } as DOMRect);
      resized!([{ borderBoxSize: [{ blockSize: 220 }] }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
      expect(resizedFixture.nativeElement.querySelector('.v1-account-portfolio').style.getPropertyValue('--portfolio-sticky-height')).toBe('220px');
      resizedFixture.destroy();
      expect(disconnect).toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

  it('collapses the header gap after scrolling and restores it at the top, releasing the observer', () => {
    let intersected!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { intersected = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const observedFixture = TestBed.createComponent(DataInventoryComponent);
    try {
      observedFixture.detectChanges();
      expect(observe).toHaveBeenCalled();
      intersected([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver);
      observedFixture.detectChanges();
      expect(observedFixture.nativeElement.querySelector('.v1-account-portfolio--scrolled')).not.toBeNull();
      intersected([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver);
      observedFixture.detectChanges();
      expect(observedFixture.nativeElement.querySelector('.v1-account-portfolio--scrolled')).toBeNull();
      observedFixture.destroy();
      expect(disconnect).toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

  it('shows a shell-level empty state when the account has no facilities', () => {
    facilities.set([]);
    const workspace = TestBed.inject(AccountWorkspaceStore);
    (workspace.accountAnalyses as ReturnType<typeof signal<any[]>>).set([]);
    (workspace.facilityAnalyses as ReturnType<typeof signal<any[]>>).set([]);
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

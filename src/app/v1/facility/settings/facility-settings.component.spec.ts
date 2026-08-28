import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { PreparedBackupFile } from '@data/backup/backup-preparation.service';
import { BackupFile } from '@data/models/backup-file';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { DEFAULT_DATA_STALENESS_MONTHS } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { V1Routes } from '../../v1.routes';
import { FacilitySettingsBackupComponent } from './backup/facility-settings-backup.component';
import { ImportFacilityBackupComponent } from './backup/import-facility-backup.component';
import { FacilitySettingsDeleteComponent } from './delete/facility-settings-delete.component';
import { FacilitySettingsComponent } from './facility-settings.component';
import { FacilitySettingsModule } from './facility-settings.module';
import { FacilitySettingsFinancialComponent } from './financial/facility-settings-financial.component';
import { FacilitySettingsGoalsComponent } from './goals/facility-settings-goals.component';
import { PortfolioTransitionSettingsComponent } from './portfolio-transition/portfolio-transition-settings.component';
import { FacilitySettingsProfileComponent } from './profile/facility-settings-profile.component';
import { FacilitySettingsStalenessComponent } from './staleness/facility-settings-staleness.component';
import { FacilitySettingsUnitsComponent } from './units/facility-settings-units.component';

describe('Facility settings routed components', () => {
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let selectedFacility: ReturnType<typeof signal<IdbFacility | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let canWrite: ReturnType<typeof signal<boolean>>;
  let commandBoundary: { execute: ReturnType<typeof vi.fn> };
  let accountHandler: { update: ReturnType<typeof vi.fn> };
  let facilityHandler: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let lifecycle: {
    refreshAccountCatalog: ReturnType<typeof vi.fn>;
    handleMarkedAccountDeletion: ReturnType<typeof vi.fn>;
  };
  let backupExportCoordinator: { exportFacility: ReturnType<typeof vi.fn> };
  let backupImportCoordinator: {
    prepareTextBackup: ReturnType<typeof vi.fn>;
    importNewFacility: ReturnType<typeof vi.fn>;
    replaceFacility: ReturnType<typeof vi.fn>;
  };
  let navigation: {
    accountRoute: ReturnType<typeof vi.fn>;
    openAccount: ReturnType<typeof vi.fn>;
    setFacility: ReturnType<typeof vi.fn>;
    showWelcome: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    account = signal(accountFixture());
    selectedFacility = signal(facilityFixture('facility-a'));
    facilities = signal([selectedFacility()!, facilityFixture('facility-b')]);
    canWrite = signal(true);
    commandBoundary = {
      execute: vi.fn(async (_metadata, operation: () => Promise<unknown>) => ({ value: await operation(), change: {} }))
    };
    accountHandler = {
      update: vi.fn(async updated => updated)
    };
    facilityHandler = {
      add: vi.fn(async (facility: IdbFacility) => ({ facility: { ...facility, id: 3, guid: 'facility-new' } })),
      update: vi.fn(async updated => updated),
      delete: vi.fn(async () => undefined)
    };
    lifecycle = {
      refreshAccountCatalog: vi.fn(async () => undefined),
      handleMarkedAccountDeletion: vi.fn(async () => [])
    };
    backupExportCoordinator = {
      exportFacility: vi.fn(async () => facilityBackupFile())
    };
    backupImportCoordinator = {
      prepareTextBackup: vi.fn(() => facilityBackupFile() as PreparedBackupFile),
      importNewFacility: vi.fn(async () => facilityFixture('imported-facility')),
      replaceFacility: vi.fn(async () => facilityFixture('replacement-facility'))
    };
    navigation = {
      accountRoute: vi.fn((accountGuid: string) => ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview']),
      openAccount: vi.fn(async () => undefined),
      setFacility: vi.fn(),
      showWelcome: vi.fn()
    };
    router = {
      navigate: vi.fn(async () => true)
    };

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        FacilitySettingsModule
      ],
      providers: [
        SettingsFormService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            selectedFacility,
            facilities,
            accountAnalyses: signal([]),
            accountReports: signal([]),
            canWrite,
            hasPending: signal(false),
            customEmissions: signal([])
          }
        },
        { provide: WorkspaceCommandBoundary, useValue: commandBoundary },
        { provide: AccountCommandHandler, useValue: accountHandler },
        { provide: FacilityCommandHandler, useValue: facilityHandler },
        { provide: ApplicationLifecycleService, useValue: lifecycle },
        { provide: BackupExportCoordinator, useValue: backupExportCoordinator },
        { provide: BackupImportCoordinator, useValue: backupImportCoordinator },
        { provide: WorkspaceNavigationService, useValue: navigation },
        { provide: Router, useValue: router },
        {
          provide: LoadingService,
          useValue: {
            clearLoadingMessages: vi.fn(),
            addLoadingMessage: vi.fn(),
            setCurrentLoadingIndex: vi.fn(),
            setContext: vi.fn(),
            setTitle: vi.fn(),
            setLoadingComplete: vi.fn()
          }
        },
        { provide: EGridService, useValue: { subRegionsByZipcode: [{ zip: '37932', subregions: ['SRTV'] }] } }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the parent settings shell focused on layout and routed detail outlet', () => {
    const fixture = TestBed.createComponent(FacilitySettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility settings');
    expect(fixture.nativeElement.textContent).toContain('Facility A');
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Facility information');

    selectedFacility.set(undefined);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No facility selected');
  });

  it('keeps facility settings terminology for valid single-facility accounts', () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = TestBed.createComponent(FacilitySettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility settings');
    expect(fixture.nativeElement.textContent).not.toContain('Site setup');
  });

  it('defines facility settings details as child routes of the settings shell', () => {
    const facilityRoute = V1Routes[0].children?.find(route => route.path === 'workspace/facility/:facilityGuid');
    const settingsRoute = facilityRoute?.children?.find(route => route.path === 'settings');
    const childPaths = settingsRoute?.children?.map(route => route.path);

    expect(settingsRoute?.component).toBe(FacilitySettingsComponent);
    expect(childPaths).toEqual(['', 'profile', 'units', 'goals', 'financial', 'staleness', 'backup', 'portfolio', 'delete', '**']);
  });

  it('autosaves facility profile text after a debounce without stealing focus', async () => {
    vi.useFakeTimers();
    let releaseSave: () => void;
    const saveHasStarted = new Promise<void>(resolveStarted => {
      commandBoundary.execute.mockImplementationOnce(async (_metadata, operation: () => Promise<unknown>) => {
        resolveStarted();
        await new Promise<void>(resolve => {
          releaseSave = resolve;
        });
        return { value: await operation(), change: {} };
      });
    });
    const fixture = createDetail(FacilitySettingsProfileComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');

    input.focus();
    input.value = 'Updated Facility';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(600);
    await saveHasStarted;
    fixture.detectChanges(false);

    expect(fixture.componentInstance.saveState).toBe('saving');
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);

    releaseSave!();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges(false);

    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'facility-a', name: 'Updated Facility' }),
      'account-a'
    );
  });

  it('shows validation without saving a blank facility name', async () => {
    vi.useFakeTimers();
    const fixture = createDetail(FacilitySettingsProfileComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');

    input.value = ' ';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();

    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Name is required');
  });

  it('disables facility detail forms from canWrite state', () => {
    const fixture = createDetail(FacilitySettingsProfileComponent);

    canWrite.set(false);
    fixture.detectChanges(false);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');
    expect(input.disabled).toBe(true);
  });

  it('mirrors matching profile fields to the account for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(FacilitySettingsProfileComponent);
    fixture.componentInstance.form.patchValue({
      name: 'Updated Site',
      city: 'Oak Ridge',
      state: 'TN',
      zip: '37830',
      address: '2 Main St',
      size: 45000,
      classification: 'Manufacturing'
    });

    await fixture.componentInstance.saveProfile();

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'account',
        publication: expect.objectContaining({ mode: 'patch' })
      }),
      expect.any(Function)
    );
    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Site',
        city: 'Oak Ridge',
        state: 'TN',
        zip: '37830',
        address: '2 Main St'
      }),
      'account-a'
    );
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Site',
        city: 'Oak Ridge',
        classification: 'Manufacturing'
      }),
      'account-a'
    );
  });

  it('copies account units only after confirmation', async () => {
    selectedFacility.set({
      ...facilityFixture('facility-a'),
      unitsOfMeasure: 'Metric',
      energyUnit: 'GJ',
      eGridSubregion: 'US Average'
    });
    const fixture = createDetail(FacilitySettingsUnitsComponent);

    fixture.componentInstance.openAccountUpdateConfirm();
    fixture.detectChanges(false);

    expect(fixture.componentInstance.showAccountUpdateConfirm).toBe(true);
    expect(facilityHandler.update).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmAccountSettingsUpdate();

    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        energyUnit: 'MMBtu',
        volumeLiquidUnit: 'gal',
        volumeGasUnit: 'SCF',
        massUnit: 'lb',
        electricityUnit: 'kWh',
        eGridSubregion: 'SRTV'
      }),
      'account-a'
    );
  });

  it('mirrors matching unit fields to the account for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(FacilitySettingsUnitsComponent);
    fixture.componentInstance.form.patchValue({
      unitsOfMeasure: 'Metric',
      energyUnit: 'GJ',
      electricityUnit: 'kWh',
      volumeLiquidUnit: 'L',
      volumeGasUnit: 'm3',
      massUnit: 'kg',
      energyIsSource: false
    });

    await fixture.componentInstance.saveUnits();

    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        unitsOfMeasure: 'Custom',
        energyUnit: 'GJ',
        volumeLiquidUnit: 'L',
        volumeGasUnit: 'm3',
        massUnit: 'kg',
        energyIsSource: false
      }),
      'account-a'
    );
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        unitsOfMeasure: 'Custom',
        energyUnit: 'GJ',
        volumeLiquidUnit: 'L',
        volumeGasUnit: 'm3',
        massUnit: 'kg',
        energyIsSource: false
      }),
      'account-a'
    );
  });

  it('keeps greenhouse goals account-owned but shows facility goals when account emissions are enabled', () => {
    account.set({ ...accountFixture(), displayEmissions: true });
    const fixture = createDetail(FacilitySettingsGoalsComponent);

    expect(fixture.componentInstance.form.controls['displayEmissions']).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Greenhouse emission/carbon reduction goal');
  });

  it('copies account goals only after confirmation and preserves failed local edits', async () => {
    selectedFacility.set({
      ...facilityFixture('facility-a'),
      sustainabilityQuestions: {
        ...accountFixture().sustainabilityQuestions,
        energyReductionPercent: 10
      }
    });
    const fixture = createDetail(FacilitySettingsGoalsComponent);

    fixture.componentInstance.openAccountUpdateConfirm();
    expect(facilityHandler.update).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmAccountSettingsUpdate();

    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sustainabilityQuestions: expect.objectContaining({ energyReductionPercent: 25 })
      }),
      'account-a'
    );

    commandBoundary.execute.mockRejectedValueOnce(new Error('persist failed'));
    fixture.componentInstance.form.controls['energyReductionPercent'].setValue(40);

    await fixture.componentInstance.saveGoals();

    expect(fixture.componentInstance.form.controls['energyReductionPercent'].value).toBe(40);
    expect(fixture.componentInstance.saveState).toBe('error');
  });

  it('mirrors matching goal fields to the account for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(FacilitySettingsGoalsComponent);
    fixture.componentInstance.form.controls['energyReductionPercent'].setValue(40);

    await fixture.componentInstance.saveGoals();

    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sustainabilityQuestions: expect.objectContaining({ energyReductionPercent: 40 })
      }),
      'account-a'
    );
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sustainabilityQuestions: expect.objectContaining({ energyReductionPercent: 40 })
      }),
      'account-a'
    );
  });

  it('mirrors matching financial fields to the account for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    const fixture = createDetail(FacilitySettingsFinancialComponent);
    fixture.componentInstance.form.patchValue({
      fiscalYear: 'nonCalendarYear',
      fiscalYearMonth: 6,
      fiscalYearCalendarEnd: false
    });

    await fixture.componentInstance.saveFinancial();

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'account',
        publication: expect.objectContaining({ mode: 'patch' })
      }),
      expect.any(Function)
    );
    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false }),
      'account-a'
    );
    expect(lifecycle.refreshAccountCatalog).toHaveBeenCalled();
  });

  it('honors facility staleness inheritance and copies current account values', async () => {
    account.set({ ...accountFixture(), dataStalenessSettings: { enabled: false, thresholdMonths: 12 } });
    selectedFacility.set({
      ...facilityFixture('facility-a'),
      dataStalenessSettings: { enabled: true, thresholdMonths: 3, useAccountSettings: false }
    });
    const fixture = createDetail(FacilitySettingsStalenessComponent);

    fixture.componentInstance.form.controls['useAccountSettings'].setValue(true);
    await fixture.componentInstance.onUseAccountStalenessChange();

    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        dataStalenessSettings: { enabled: false, thresholdMonths: 12, useAccountSettings: true }
      }),
      'account-a'
    );
    expect(fixture.componentInstance.form.controls['enabled'].disabled).toBe(true);
  });

  it('mirrors matching staleness fields to the account for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(FacilitySettingsStalenessComponent);
    fixture.componentInstance.form.patchValue({
      useAccountSettings: false,
      enabled: false,
      thresholdMonths: 12
    });

    await fixture.componentInstance.saveStaleness();

    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        dataStalenessSettings: { enabled: false, thresholdMonths: 12 }
      }),
      'account-a'
    );
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        dataStalenessSettings: { enabled: false, thresholdMonths: 12, useAccountSettings: false }
      }),
      'account-a'
    );
  });

  it('confirms before exporting a facility backup and opens the v1 import panel', async () => {
    const fixture = createDetail(FacilitySettingsBackupComponent);

    buttonByText(fixture, 'Backup facility').click();
    fixture.detectChanges(false);

    expect(backupExportCoordinator.exportFacility).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmBackupDownload();

    expect(backupExportCoordinator.exportFacility).toHaveBeenCalledWith('facility-a');

    buttonByText(fixture, 'Import backup').click();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.textContent).toContain('Upload Facility Backup');
  });

  it('requires a facility name before converting a single-facility account', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(PortfolioTransitionSettingsComponent);

    buttonByText(fixture, 'Add facility and convert').click();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.textContent).toContain('Name is required');
    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(facilityHandler.add).not.toHaveBeenCalled();
    expect(accountHandler.update).not.toHaveBeenCalled();
  });

  it('adds a facility and clears single-facility mode through one reload command', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    const fixture = createDetail(PortfolioTransitionSettingsComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="facilityName"]');
    input.value = '  Second Site  ';
    input.dispatchEvent(new Event('input'));

    buttonByText(fixture, 'Add facility and convert').click();
    fixture.detectChanges(false);

    expect(fixture.componentInstance.showConfirm).toBe(true);
    await fixture.componentInstance.confirmConversion();
    fixture.detectChanges(false);

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'account',
        changeKind: 'update',
        entityGuid: 'account-a',
        publication: { mode: 'reload' }
      }),
      expect.any(Function)
    );
    expect(facilityHandler.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Second Site', accountId: 'account-a' }),
      'account-a',
      [],
      []
    );
    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'account-a', isSingleFacilityCompany: false }),
      'account-a'
    );
    expect(lifecycle.refreshAccountCatalog).toHaveBeenCalled();
    expect(fixture.componentInstance.completedFacility).toEqual(expect.objectContaining({ guid: 'facility-new' }));
  });

  it('keeps the new facility name visible when conversion fails', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!]);
    commandBoundary.execute.mockRejectedValueOnce(new Error('persist failed'));
    const fixture = createDetail(PortfolioTransitionSettingsComponent);
    fixture.componentInstance.form.controls.facilityName.setValue('Unsaved Site');

    await fixture.componentInstance.confirmConversion();
    fixture.detectChanges(false);

    expect(fixture.componentInstance.form.controls.facilityName.value).toBe('Unsaved Site');
    expect(fixture.componentInstance.saveState).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('Changes could not be saved');
  });

  it('repairs single-facility accounts that already have multiple facilities without adding another facility', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    facilities.set([selectedFacility()!, facilityFixture('facility-b')]);
    const fixture = createDetail(PortfolioTransitionSettingsComponent);

    expect(fixture.nativeElement.textContent).toContain('Finish portfolio conversion');
    await fixture.componentInstance.confirmConversion();

    expect(facilityHandler.add).not.toHaveBeenCalled();
    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'account-a', isSingleFacilityCompany: false }),
      'account-a'
    );
  });

  it('imports facility backups as replace or new from the v1 import panel', async () => {
    const fixture = TestBed.createComponent(ImportFacilityBackupComponent);
    fixture.detectChanges();

    await fixture.componentInstance.setImportFile(fileInputEvent(JSON.stringify(facilityBackupFile())));
    await fixture.componentInstance.importBackupFile();

    expect(backupImportCoordinator.replaceFacility).toHaveBeenCalledWith(
      expect.objectContaining({ backupFileType: 'Facility' }),
      account()!,
      selectedFacility()!
    );

    fixture.componentInstance.importMode = 'new';
    await fixture.componentInstance.importBackupFile();

    expect(backupImportCoordinator.importNewFacility).toHaveBeenCalledWith(
      expect.objectContaining({ backupFileType: 'Facility' }),
      'account-a'
    );
  });

  it('rejects account backups in the facility import panel', async () => {
    const fixture = TestBed.createComponent(ImportFacilityBackupComponent);
    fixture.detectChanges();
    backupImportCoordinator.prepareTextBackup.mockReturnValueOnce({ ...facilityBackupFile(), backupFileType: 'Account' });

    await fixture.componentInstance.setImportFile(fileInputEvent('{}'));
    fixture.detectChanges(false);

    expect(fixture.componentInstance.backupFileError).toContain('account backup');
    expect(backupImportCoordinator.replaceFacility).not.toHaveBeenCalled();
  });

  it('confirms before deleting a portfolio facility and navigates to a remaining facility', async () => {
    const fixture = createDetail(FacilitySettingsDeleteComponent);

    buttonByText(fixture, 'Delete facility').click();
    fixture.detectChanges(false);

    expect(facilityHandler.delete).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmDelete();

    expect(facilityHandler.delete).toHaveBeenCalledWith(
      selectedFacility()!,
      'account-a',
      expect.any(Function)
    );
    expect(navigation.setFacility).toHaveBeenCalledWith('facility-b');
  });

  it('uses account deletion behavior for single-facility accounts', async () => {
    account.set({ ...accountFixture(), isSingleFacilityCompany: true });
    lifecycle.handleMarkedAccountDeletion.mockImplementationOnce(async () => {
      account.set(undefined);
      return [];
    });
    const fixture = createDetail(FacilitySettingsDeleteComponent);

    await fixture.componentInstance.confirmDelete();

    expect(accountHandler.update).toHaveBeenCalledWith(expect.objectContaining({ deleteAccount: true }), 'account-a');
    expect(facilityHandler.delete).not.toHaveBeenCalled();
    expect(navigation.showWelcome).toHaveBeenCalled();
  });
});

function createDetail<T>(component: new (...args: any[]) => T): ComponentFixture<T> {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

function buttonByText<T>(fixture: ComponentFixture<T>, text: string): HTMLButtonElement {
  return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
    .find(button => button.textContent?.includes(text))!;
}

function fileInputEvent(text: string): Event {
  const file = { name: 'facility-backup.json', text: vi.fn(async () => text) };
  return {
    target: {
      files: [file]
    }
  } as unknown as Event;
}

function accountFixture(): IdbAccount {
  return {
    guid: 'account-a',
    name: 'Account A',
    country: 'US',
    city: 'Knoxville',
    state: 'TN',
    zip: '37932',
    address: '1 Main St',
    naics1: '31',
    naics2: undefined,
    naics3: undefined,
    size: 0,
    notes: '',
    color: undefined,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    unitsOfMeasure: 'Imperial',
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal',
    volumeGasUnit: 'SCF',
    massUnit: 'lb',
    energyIsSource: true,
    eGridSubregion: 'SRTV',
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true,
    archiveOption: 'skip',
    assessmentReportVersion: 'AR6',
    displayEmissions: false,
    sustainabilityQuestions: {
      energyReductionGoal: true,
      energyReductionPercent: 25,
      energyReductionBaselineYear: 2020,
      energyReductionTargetYear: 2030,
      energyIsAbsolute: false,
      greenhouseReductionGoal: false,
      greenhouseReductionPercent: 0,
      greenhouseReductionBaselineYear: 2020,
      greenhouseReductionTargetYear: 2030,
      greenhouseIsAbsolute: true,
      waterReductionGoal: false,
      waterReductionPercent: 0,
      waterReductionBaselineYear: 2020,
      waterReductionTargetYear: 2030,
      waterIsAbsolute: false
    },
    dataStalenessSettings: {
      enabled: true,
      thresholdMonths: DEFAULT_DATA_STALENESS_MONTHS
    }
  } as IdbAccount;
}

function facilityFixture(guid: string): IdbFacility {
  return {
    ...accountFixture(),
    guid,
    accountId: 'account-a',
    name: guid === 'facility-a' ? 'Facility A' : 'Facility B',
    size: 10000,
    classification: 'Manufacturing',
    isNewFacility: false,
    dataStalenessSettings: {
      enabled: true,
      thresholdMonths: DEFAULT_DATA_STALENESS_MONTHS,
      useAccountSettings: false
    }
  } as IdbFacility;
}

function facilityBackupFile(): BackupFile {
  return {
    origin: 'VERIFI',
    backupFileType: 'Facility',
    dataVersion: 2,
    dataBackupId: 'backup-id',
    timeStamp: new Date('2026-08-26T12:00:00.000Z'),
    account: undefined as unknown as BackupFile['account'],
    facilities: [],
    facility: facilityFixture('facility-backup'),
    meters: [],
    meterData: [],
    groups: [],
    accountReports: [],
    accountAnalysisItems: [],
    facilityAnalysisItems: [],
    predictorData: [],
    predictorDataV2: [],
    predictors: [],
    customEmissionsItems: [],
    customFuels: [],
    customGWPs: [],
    facilityReports: [],
    facilityEnergyUseGroups: [],
    facilityEnergyUseEquipment: []
  };
}

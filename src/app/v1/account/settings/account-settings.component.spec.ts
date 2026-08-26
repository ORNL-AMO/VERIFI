import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { BackupFile } from '@data/models/backup-file';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AutomaticBackupsService } from '@platform/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { AccountSettingsFormService } from '@shared/settings-forms/account-settings-form.service';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsModule } from './account-settings.module';
import { AccountSettingsBackupComponent } from './backup/account-settings-backup.component';
import { AccountSettingsFinancialComponent } from './financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './goals/account-settings-goals.component';
import { AccountSettingsProfileComponent } from './profile/account-settings-profile.component';
import { AccountSettingsUnitsComponent } from './units/account-settings-units.component';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { V1Routes } from '../../v1.routes';

describe('Account settings routed components', () => {
  let account: ReturnType<typeof signal<IdbAccount | undefined>>;
  let facilities: ReturnType<typeof signal<IdbFacility[]>>;
  let canWrite: ReturnType<typeof signal<boolean>>;
  let commandBoundary: { execute: ReturnType<typeof vi.fn> };
  let accountHandler: { update: ReturnType<typeof vi.fn> };
  let facilityHandler: { update: ReturnType<typeof vi.fn> };
  let lifecycle: { refreshAccountCatalog: ReturnType<typeof vi.fn> };
  let backupExportCoordinator: {
    exportActiveAccount: ReturnType<typeof vi.fn>;
    buildActiveAccountBackup: ReturnType<typeof vi.fn>;
  };
  let backupGateway: {
    isAvailable: boolean;
    chooseSavePath: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
  };
  let automaticBackups: {
    status: BehaviorSubject<string>;
    saving: BehaviorSubject<boolean>;
    addOrUpdateFile: ReturnType<typeof vi.fn>;
    inspectCurrentAccountFile: ReturnType<typeof vi.fn>;
  };
  let navigation: { openAccount: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    account = signal(accountFixture());
    facilities = signal([facilityFixture('facility-a'), facilityFixture('facility-b')]);
    canWrite = signal(true);
    commandBoundary = {
      execute: vi.fn(async (_metadata, operation: () => Promise<unknown>) => ({ value: await operation(), change: {} }))
    };
    accountHandler = {
      update: vi.fn(async updated => updated)
    };
    facilityHandler = {
      update: vi.fn(async updated => updated)
    };
    lifecycle = {
      refreshAccountCatalog: vi.fn(async () => undefined)
    };
    backupExportCoordinator = {
      exportActiveAccount: vi.fn(async () => backupFile()),
      buildActiveAccountBackup: vi.fn(() => backupFile())
    };
    backupGateway = {
      isAvailable: false,
      chooseSavePath: vi.fn(async () => '/tmp/account-backup.json'),
      write: vi.fn(async () => undefined)
    };
    automaticBackups = {
      status: new BehaviorSubject('disabled'),
      saving: new BehaviorSubject(false),
      addOrUpdateFile: vi.fn(async () => undefined),
      inspectCurrentAccountFile: vi.fn(async () => undefined)
    };
    navigation = {
      openAccount: vi.fn(async () => undefined)
    };

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        AccountSettingsModule
      ],
      providers: [
        AccountSettingsFormService,
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account,
            facilities,
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
        { provide: ElectronBackupFileGateway, useValue: backupGateway },
        { provide: AutomaticBackupsService, useValue: automaticBackups },
        { provide: WorkspaceNavigationService, useValue: navigation },
        { provide: BackupImportCoordinator, useValue: { prepareTextBackup: vi.fn(), importNewAccount: vi.fn() } },
        { provide: EGridService, useValue: { subRegionsByZipcode: [{ zip: '37932', subregions: ['SRTV'] }] } }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the parent settings shell focused on layout and routed detail outlet', () => {
    const fixture = TestBed.createComponent(AccountSettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account A');
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Corporate information');

    account.set(undefined);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No account loaded');
  });

  it('defines account settings details as child routes of the settings shell', () => {
    const accountRoute = V1Routes[0].children?.find(route => route.path === 'workspace/account/:accountGuid');
    const settingsRoute = accountRoute?.children?.find(route => route.path === 'settings');
    const childPaths = settingsRoute?.children?.map(route => route.path);

    expect(settingsRoute?.component).toBe(AccountSettingsComponent);
    expect(childPaths).toEqual(['', 'profile', 'units', 'goals', 'financial', 'staleness', 'backup', '**']);
  });

  it('autosaves profile text locally after a debounce', async () => {
    vi.useFakeTimers();
    const fixture = createDetail(AccountSettingsProfileComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');
    input.value = 'Updated Account';
    input.dispatchEvent(new Event('input'));

    expect(commandBoundary.execute).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(accountHandler.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Account' }), 'account-a');
    expect(fixture.componentInstance.saveState).toBe('saved');
  });

  it('keeps profile text inputs enabled while autosave is saving', async () => {
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
    const fixture = createDetail(AccountSettingsProfileComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');
    input.focus();
    input.value = 'Edited While Saving';
    input.dispatchEvent(new Event('input'));

    await vi.advanceTimersByTimeAsync(600);
    await saveHasStarted;
    fixture.detectChanges(false);

    expect(fixture.componentInstance.saveState).toBe('saving');
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);

    releaseSave!();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('shows profile validation locally instead of saving a blank account name', async () => {
    vi.useFakeTimers();
    const fixture = createDetail(AccountSettingsProfileComponent);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');
    input.value = ' ';
    input.dispatchEvent(new Event('input'));

    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();

    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Name is required');
  });

  it('keeps local profile form edits visible when persistence fails', async () => {
    const fixture = createDetail(AccountSettingsProfileComponent);
    commandBoundary.execute.mockRejectedValueOnce(new Error('persist failed'));
    fixture.componentInstance.form.controls['name'].setValue('Unsaved Account');

    await fixture.componentInstance.saveProfile();
    fixture.detectChanges(false);

    expect(fixture.componentInstance.form.controls['name'].value).toBe('Unsaved Account');
    expect(fixture.componentInstance.saveState).toBe('error');
    expect(fixture.componentInstance.saveError).toContain('Changes could not be saved');
  });

  it('disables detail forms from canWrite state', () => {
    const fixture = createDetail(AccountSettingsProfileComponent);

    canWrite.set(false);
    fixture.detectChanges(false);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="name"]');
    expect(input.disabled).toBe(true);
  });

  it('shows assess other impacts in goals instead of units', () => {
    const unitsFixture = createDetail(AccountSettingsUnitsComponent);
    const goalsFixture = createDetail(AccountSettingsGoalsComponent);

    expect(unitsFixture.nativeElement.textContent).not.toContain('Assess other impacts of operations');
    expect(goalsFixture.nativeElement.textContent).toContain('Assess other impacts of operations');
    expect(goalsFixture.componentInstance.form.controls['displayEmissions'].value).toBe(false);
  });

  it('updates facilities from the routed financial settings component', async () => {
    const fixture = createDetail(AccountSettingsFinancialComponent);
    fixture.componentInstance.form.patchValue({
      fiscalYear: 'nonCalendarYear',
      fiscalYearMonth: 6,
      fiscalYearCalendarEnd: false
    });

    await fixture.componentInstance.saveFinancial();

    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false }),
      'account-a'
    );
    expect(facilityHandler.update).toHaveBeenCalledTimes(2);
    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        publication: expect.objectContaining({ mode: 'patch' })
      }),
      expect.any(Function)
    );
  });

  it('owns backup confirmation and import panel in the routed backup component', async () => {
    const fixture = createDetail(AccountSettingsBackupComponent);

    buttonByText(fixture, 'Backup account').click();
    fixture.detectChanges(false);

    expect(backupExportCoordinator.exportActiveAccount).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Download JSON backup');

    await fixture.componentInstance.confirmBackupDownload();
    fixture.detectChanges(false);

    expect(backupExportCoordinator.exportActiveAccount).toHaveBeenCalledWith({ downloadAsZip: false });

    buttonByText(fixture, 'Import backup').click();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.textContent).toContain('Upload Account Backup');
  });

  it('keeps automatic backup visible in web and enabled when the desktop gateway is available', () => {
    let fixture = createDetail(AccountSettingsBackupComponent);

    expect(fixture.nativeElement.textContent).toContain('Automatic account backup');
    expect(fixture.nativeElement.textContent).toContain('Available in the desktop application');
    expect(buttonByText(fixture, 'Select backup file').disabled).toBe(true);

    fixture.destroy();
    backupGateway.isAvailable = true;
    fixture = createDetail(AccountSettingsBackupComponent);

    expect(buttonByText(fixture, 'Select backup file').disabled).toBe(false);
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
      thresholdMonths: 3
    }
  } as IdbAccount;
}

function facilityFixture(guid: string): IdbFacility {
  return {
    guid,
    accountId: 'account-a',
    name: guid,
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true
  } as IdbFacility;
}

function backupFile(): BackupFile {
  return {
    origin: 'VERIFI',
    backupFileType: 'Account',
    dataVersion: 2,
    dataBackupId: 'backup-id',
    timeStamp: new Date('2026-08-26T12:00:00.000Z'),
    account: accountFixture(),
    facilities: [],
    facility: undefined as unknown as BackupFile['facility'],
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

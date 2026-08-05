import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { LegacyWorkspaceStateBridge } from '../account-workspace/legacy-workspace-state-bridge.service';
import { WorkspaceSelectionStorageService } from '../account-workspace/workspace-selection-storage.service';
import { AutomaticBackupsService } from '../electron/automatic-backups.service';
import { ElectronService } from '../electron/electron.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { AnalysisSelectionRepairService } from '../indexedDB/analysis-selection-repair.service';
import { ApplicationInstanceDbService } from '../indexedDB/application-instance-db.service';
import { CustomEmissionsDbService } from '../indexedDB/custom-emissions-db.service';
import { DataMigrationRunnerService } from '../indexedDB/data-migrations/data-migration-runner.service';
import { ElectronBackupsDbService } from '../indexedDB/electron-backups-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IndexedDbTransactionService } from '../indexedDB/indexed-db-transaction.service';
import { IdbAccount } from '../models/idbModels/account';
import { EGridService } from '../shared/helper-services/e-grid.service';
import { AppStartupState, AppStartupStep } from './application-lifecycle.models';

const INITIAL_STATE: AppStartupState = { status: 'idle' };

@Injectable({ providedIn: 'root' })
export class ApplicationLifecycleService {
  private readonly writableState = signal<AppStartupState>(INITIAL_STATE);
  private readonly writablePersistenceReady = signal(false);
  private readonly writableAccountCatalog = signal<readonly IdbAccount[]>([]);
  private activeInitialization?: Promise<AppStartupState>;

  readonly state = this.writableState.asReadonly();
  readonly persistenceReady = this.writablePersistenceReady.asReadonly();
  readonly accountCatalog = this.writableAccountCatalog.asReadonly();
  readonly usableAccounts = computed(() => this.accountCatalog().filter(account => !account.deleteAccount));
  readonly hasAccounts = computed(() => this.usableAccounts().length > 0);
  readonly isInitializing = computed(() => this.state().status === 'initializing');
  readonly error = computed(() => this.state().error);

  constructor(
    private transactions: IndexedDbTransactionService,
    private migrations: DataMigrationRunnerService,
    private applicationInstance: ApplicationInstanceDbService,
    private eGrid: EGridService,
    private accounts: AccountdbService,
    private facilities: FacilitydbService,
    private customEmissions: CustomEmissionsDbService,
    private analysisSelectionRepair: AnalysisSelectionRepairService,
    private workspace: AccountWorkspaceService,
    private workspaceStore: AccountWorkspaceStore,
    private selectionStorage: WorkspaceSelectionStorageService,
    private legacyBridge: LegacyWorkspaceStateBridge,
    private electron: ElectronService,
    private electronBackups: ElectronBackupsDbService,
    private automaticBackups: AutomaticBackupsService
  ) { }

  initialize(): Promise<AppStartupState> {
    if (this.activeInitialization) { return this.activeInitialization; }
    if (this.state().status === 'ready' || this.state().status === 'empty') {
      return Promise.resolve(this.state());
    }
    const active = this.runInitialization().finally(() => {
      if (this.activeInitialization === active) { this.activeInitialization = undefined; }
    });
    this.activeInitialization = active;
    return active;
  }

  retry(): Promise<AppStartupState> {
    if (this.activeInitialization) { return this.activeInitialization; }
    this.writableState.set(INITIAL_STATE);
    return this.initialize();
  }

  async refreshAccountCatalog(): Promise<readonly IdbAccount[]> {
    const accounts = sortAccounts(await firstValueFrom(this.accounts.getAll()));
    this.writableAccountCatalog.set(accounts);
    this.legacyBridge.publishAccountCatalog(accounts);
    return accounts;
  }

  private async runInitialization(): Promise<AppStartupState> {
    let currentStep: AppStartupStep = 'database';
    try {
      this.setStep(currentStep, 'Opening application data...');
      await this.transactions.runTransaction(['application'], 'readonly', transaction =>
        transaction.getAll('application')
      );

      currentStep = 'migrations';
      this.setStep(currentStep, 'Updating application data...');
      await this.migrations.runMigrations();
      this.writablePersistenceReady.set(true);

      currentStep = 'application-metadata';
      this.setStep(currentStep, 'Initializing application metadata...');
      await this.applicationInstance.initializeApplicationInstanceData();

      currentStep = 'reference-data';
      this.setStep(currentStep, 'Loading reference data...');
      await Promise.all([this.eGrid.parseZipCodeLongLat(), this.eGrid.parseEGridData()]);

      currentStep = 'account-catalog';
      this.setStep(currentStep, 'Loading accounts...');
      await this.refreshAccountCatalog();

      currentStep = 'account-selection';
      this.setStep(currentStep, 'Selecting an account...');
      const account = resolveInitialAccount(this.usableAccounts(), this.selectionStorage.read().accountId);
      if (!account) {
        this.workspace.clear();
        this.legacyBridge.clear();
        this.selectionStorage.clearAccount();
        await this.initializeOptionalIntegrations();
        return this.finish({ status: 'empty', message: 'No accounts are available.' });
      }

      await this.removeObsoleteCustomEmissions(account.guid);

      currentStep = 'workspace';
      this.setStep(currentStep, 'Loading account workspace...');
      await this.workspace.selectAccount(account.guid);
      await this.repairAnalysisSelections();

      await this.initializeOptionalIntegrations();
      return this.finish({ status: 'ready' });
    } catch (cause) {
      const state: AppStartupState = {
        status: 'error',
        step: currentStep,
        message: startupErrorMessage(currentStep),
        error: {
          step: currentStep,
          message: startupErrorMessage(currentStep),
          retryable: true,
          cause
        }
      };
      this.writableState.set(state);
      return state;
    }
  }

  private async initializeOptionalIntegrations(): Promise<void> {
    if (this.electron.isElectron) {
      this.setStep('electron-metadata', 'Loading automatic backup metadata...');
      try {
        this.electronBackups.accountBackups = await firstValueFrom(this.electronBackups.getAll());
      } catch (error) {
        console.warn('Automatic backup metadata could not be loaded.', error);
      }
    }

    this.setStep('automatic-backups', 'Starting automatic backups...');
    try {
      this.automaticBackups.subscribeData();
      if (this.workspaceStore.account()) { this.automaticBackups.initializeAccount(); }
    } catch (error) {
      console.warn('Automatic backup observation could not be started.', error);
    }
  }

  private async removeObsoleteCustomEmissions(accountGuid: string): Promise<void> {
    const emissions = await this.customEmissions.getAllAccountCustomEmissions(accountGuid);
    const obsolete = emissions.filter(item => item.subregion === 'U.S. Average' && item.id !== undefined);
    await Promise.all(obsolete.map(item => firstValueFrom(this.customEmissions.deleteWithObservable(item.id))));
  }

  private async repairAnalysisSelections(): Promise<void> {
    const snapshot = this.workspaceStore.snapshot();
    if (!snapshot) { return; }
    let changed = false;
    const accountResult = this.analysisSelectionRepair.repairAccount(snapshot.account, [...snapshot.accountAnalyses]);
    if (accountResult.isChanged) {
      await firstValueFrom(this.accounts.updateWithObservable(accountResult.account));
      changed = true;
    }
    for (const facility of snapshot.facilities) {
      const result = this.analysisSelectionRepair.repairFacility(facility, [...snapshot.facilityAnalyses]);
      if (result.isChanged) {
        await firstValueFrom(this.facilities.updateWithObservable(result.facility));
        changed = true;
      }
    }
    if (changed) { await this.workspace.reloadActiveWorkspace(false); }
  }

  private setStep(step: AppStartupStep, message: string): void {
    this.writableState.set({ status: 'initializing', step, message });
  }

  private finish(state: AppStartupState): AppStartupState {
    this.writableState.set(state);
    return state;
  }
}

export function resolveInitialAccount(
  accounts: readonly IdbAccount[],
  storedAccountId: number | undefined
): IdbAccount | undefined {
  return accounts.find(account => account.id === storedAccountId) ?? accounts[0];
}

function sortAccounts(accounts: readonly IdbAccount[]): readonly IdbAccount[] {
  return [...accounts].sort((first, second) => {
    const idResult = (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER);
    return idResult || first.guid.localeCompare(second.guid);
  });
}

function startupErrorMessage(step: AppStartupStep): string {
  const messages: Record<AppStartupStep, string> = {
    database: 'VERIFI could not open its application data.',
    migrations: 'VERIFI could not update the stored data safely.',
    'application-metadata': 'VERIFI could not initialize application metadata.',
    'reference-data': 'VERIFI could not load required reference data.',
    'account-catalog': 'VERIFI could not load the account list.',
    'account-selection': 'VERIFI could not resolve the initial account.',
    workspace: 'VERIFI could not load the selected account workspace.',
    'electron-metadata': 'VERIFI could not load automatic backup metadata.',
    'automatic-backups': 'VERIFI could not start automatic backup observation.'
  };
  return messages[step];
}

import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { DataValidationSettingsCommandHandler } from '@data/account-workspace/handlers/data-validation-settings-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AccountAndFacility } from '@data/models/idbModels/accountAndFacility';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { DataStalenessMonths } from '@app/v1/status/status.settings';
import { applyDataValidationSettings, DataValidationSettingsChange, DataValidationSettingsGroup, effectiveExpectedRangeSettings, normalizeStalenessSettings } from '@shared/settings-forms/data-validation-settings';
import { SettingsSaveState } from './settings-detail.base';

/** Component-scoped editor: hydrate quietly, retain failed drafts, and serialize group edits. */
@Injectable()
export class DataValidationSettingsEditor {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly compoundHandler = inject(DataValidationSettingsCommandHandler);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly facilityContext = signal(false);
  private scopeKey = '';
  private readonly dirty = new Set<DataValidationSettingsGroup>();
  private readonly queued = new Map<DataValidationSettingsGroup, DataValidationSettingsChange>();
  private readonly saved = new Map<DataValidationSettingsGroup, string>();
  private draining?: Promise<void>;
  private destroyed = false;

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly saveState = signal<SettingsSaveState>('idle');
  readonly saveError = signal('');
  readonly stalenessForm = new FormGroup({
    enabled: new FormControl(true, { nonNullable: true }),
    thresholdMonths: new FormControl<DataStalenessMonths>(3, { nonNullable: true }),
    useAccountSettings: new FormControl(true, { nonNullable: true })
  });
  readonly expectedRangeForm = new FormGroup({
    enabled: new FormControl(true, { nonNullable: true }),
    useAccountSettings: new FormControl(true, { nonNullable: true })
  });
  readonly stalenessDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || (facility.dataStalenessSettings?.useAccountSettings ?? true)) return false;
    return JSON.stringify(normalizeStalenessSettings(account.dataStalenessSettings))
      !== JSON.stringify(normalizeStalenessSettings(facility.dataStalenessSettings));
  });
  readonly expectedRangeDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && facility.expectedRangeSettings?.useAccountSettings === false
      && effectiveExpectedRangeSettings(account).enabled !== effectiveExpectedRangeSettings(account, facility).enabled;
  });

  constructor() {
    effect(() => {
      const account = this.account();
      const facility = this.facilityContext() ? this.facility() : undefined;
      const writable = this.canWrite();
      const key = account && (!this.facilityContext() || facility) ? `${account.guid}:${facility?.guid ?? ''}` : '';
      if (key !== this.scopeKey) {
        this.scopeKey = key;
        this.dirty.clear();
        this.queued.clear();
        this.saved.clear();
        this.saveState.set('idle');
        this.saveError.set('');
      }
      if (account && key) this.hydrate(account, facility);
      this.applyAvailability(writable && !!key);
    });
    this.stalenessForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { void this.save('staleness'); });
    this.expectedRangeForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { void this.save('expectedRange'); });
    const unregister = this.unsavedChanges.register(
      () => this.hasUnsavedChanges(),
      () => this.discard(),
      () => this.isNavigationBlocked()
    );
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!this.hasUnsavedChanges() && !this.isNavigationBlocked()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload);
    this.destroyRef.onDestroy(() => {
      unregister();
      this.destroyed = true;
      this.queued.clear();
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
    });
  }

  initialize(facilityContext: boolean): void {
    this.facilityContext.set(facilityContext);
  }

  hasUnsavedChanges(): boolean { return this.dirty.size > 0; }

  isNavigationBlocked(): boolean { return !!this.draining || this.queued.size > 0; }

  discard(): void {
    if (this.isNavigationBlocked()) return;
    this.dirty.clear();
    this.queued.clear();
    const account = this.account();
    if (account) this.hydrate(account, this.facilityContext() ? this.facility() : undefined);
    this.settleSaveState();
    this.applyAvailability(this.canWrite());
  }

  useAccountSettings(group: DataValidationSettingsGroup): void {
    const account = this.account();
    if (!account || !this.canWrite()) return;
    if (group === 'staleness') {
      this.stalenessForm.patchValue({ ...normalizeStalenessSettings(account.dataStalenessSettings), useAccountSettings: true });
    } else {
      this.expectedRangeForm.patchValue({ ...effectiveExpectedRangeSettings(account), useAccountSettings: true });
    }
  }

  save(group: DataValidationSettingsGroup): Promise<void> {
    if (!this.canWrite() || !this.scopeKey || this.destroyed) return Promise.resolve();
    if (this.facilityContext()) {
      const form = group === 'staleness' ? this.stalenessForm : this.expectedRangeForm;
      if (form.controls.useAccountSettings.value) {
        const account = this.account()!;
        if (group === 'staleness') this.stalenessForm.patchValue(normalizeStalenessSettings(account.dataStalenessSettings), { emitEvent: false });
        else this.expectedRangeForm.patchValue(effectiveExpectedRangeSettings(account), { emitEvent: false });
      }
    }
    this.applyAvailability(true);
    const change = this.change(group);
    if (this.dirty.has(group) || this.signature(change) !== this.saved.get(group)) {
      this.dirty.add(group);
      this.queued.set(group, change);
    }
    if (!this.draining && this.queued.size) {
      // Start on a microtask so synchronous form changes coalesce before persistence.
      this.draining = Promise.resolve().then(() => this.drain()).finally(() => { this.draining = undefined; });
    }
    return this.draining ?? Promise.resolve();
  }

  async retry(): Promise<void> {
    for (const group of this.dirty) this.queued.set(group, this.change(group));
    await this.save(this.dirty.values().next().value ?? 'expectedRange');
  }

  private change(group: DataValidationSettingsGroup): DataValidationSettingsChange {
    if (group === 'staleness') return { group, settings: this.stalenessForm.getRawValue() };
    return { group, settings: this.expectedRangeForm.getRawValue() };
  }

  private signature(change: DataValidationSettingsChange): string {
    return JSON.stringify(this.facilityContext() ? change : { group: change.group, settings: { ...change.settings, useAccountSettings: undefined } });
  }

  private hydrate(account: AccountAndFacility, facility?: AccountAndFacility): void {
    const inheritedStaleness = facility?.dataStalenessSettings?.useAccountSettings ?? true;
    if (!this.dirty.has('staleness')) {
      this.stalenessForm.patchValue({
        ...normalizeStalenessSettings(facility && !inheritedStaleness ? facility.dataStalenessSettings : account.dataStalenessSettings),
        useAccountSettings: inheritedStaleness
      }, { emitEvent: false });
      this.saved.set('staleness', this.signature(this.change('staleness')));
    }
    if (!this.dirty.has('expectedRange')) {
      this.expectedRangeForm.patchValue({
        ...effectiveExpectedRangeSettings(account, facility),
        useAccountSettings: facility?.expectedRangeSettings?.useAccountSettings ?? true
      }, { emitEvent: false });
      this.saved.set('expectedRange', this.signature(this.change('expectedRange')));
    }
  }

  private settleSaveState(): void {
    if (this.destroyed) return;
    this.saveState.set(this.dirty.size ? 'error' : 'saved');
    this.saveError.set(this.dirty.size ? 'Changes could not be saved. Your edits are retained. Please retry.' : '');
  }

  private async drain(): Promise<void> {
    while (this.queued.size && !this.destroyed) {
      const [group, change] = this.queued.entries().next().value!;
      this.queued.delete(group);
      if (this.signature(change) === this.saved.get(group)) {
        this.dirty.delete(group);
        continue;
      }
      const key = this.scopeKey;
      const account = this.account();
      const facility = this.facilityContext() ? this.facility() : undefined;
      if (!account || !this.canWrite() || (this.facilityContext() && !facility)) {
        this.saveState.set('error');
        this.saveError.set('Settings are temporarily unavailable. Your edits are retained. Please retry.');
        return;
      }
      this.saveState.set('saving');
      this.saveError.set('');
      try {
        const label = group === 'staleness' ? 'Saving data staleness settings' : 'Saving expected-range settings';
        await this.boundary.execute({
          entityKind: facility && !account.isSingleFacilityCompany ? 'facility' : 'account',
          entityGuid: facility && !account.isSingleFacilityCompany ? facility.guid : account.guid,
          changeKind: 'update', label,
          notification: { suppressSuccessToast: true },
          publication: { mode: 'reload' }
        }, async () => {
          // Another command may have committed while this edit waited in the boundary queue.
          const currentAccount = this.account();
          const currentFacility = facility ? this.facility() : undefined;
          if (currentAccount?.guid !== account.guid || (facility && currentFacility?.guid !== facility.guid)) {
            throw new WorkspaceWriteError('stale-workspace', 'The settings context changed before saving.');
          }
          const value = currentFacility && currentAccount.isSingleFacilityCompany
            ? await this.compoundHandler.updateSingleFacility(currentAccount, currentFacility, change, account.guid)
            : currentFacility
              ? await this.facilityHandler.update(applyDataValidationSettings(structuredClone(currentFacility), change), account.guid)
              : await this.accountHandler.update(applyDataValidationSettings(structuredClone(currentAccount), change, true), account.guid);
          // Persistence committed. The old baseline cannot deduplicate a reversal if a
          // subsequent workspace or catalog refresh fails; restore it only on full success.
          if (key === this.scopeKey && !this.destroyed) this.saved.delete(group);
          return value;
        });
        if (!facility || account.isSingleFacilityCompany) await this.lifecycle.refreshAccountCatalog();
        if (key === this.scopeKey && !this.destroyed) {
          this.saved.set(group, this.signature(change));
          if (this.signature(this.change(group)) === this.signature(change)) this.dirty.delete(group);
        }
      } catch {
        if (key === this.scopeKey && !this.destroyed) {
          this.saveState.set('error');
          this.saveError.set('Changes could not be saved. Your edits are retained. Please retry.');
        }
      }
    }
    this.settleSaveState();
  }

  private applyAvailability(writable: boolean): void {
    for (const form of [this.stalenessForm, this.expectedRangeForm]) {
      if (writable) form.enable({ emitEvent: false });
      else form.disable({ emitEvent: false });
      if (writable && this.facilityContext() && form.controls.useAccountSettings.value) {
        form.controls.enabled.disable({ emitEvent: false });
      }
    }
    if (!writable || !this.stalenessForm.controls.enabled.value
      || (this.facilityContext() && this.stalenessForm.controls.useAccountSettings.value)) {
      this.stalenessForm.controls.thresholdMonths.disable({ emitEvent: false });
    }
  }
}

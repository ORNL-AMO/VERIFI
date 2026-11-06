import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbFacilityEnergyUseEquipment, EquipmentUtilityData } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbEntry, getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { energyUseMeterLinksError } from '@data/account-workspace/handlers/energy-use-command.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { ConflictChoices, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditSaveMode, SettingsHydrationMode, injectSettingsEditSession } from '@app/v1/data/editing/settings-edit-session';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUseSetupForm, EnergyUseSetupFormService } from '../../forms/energy-use-setup-form.service';
import { EnergyUseSetupValues, YearRemovalReview, addEnergyUseYear, energyUseSetup, energyUseSetupValidation, energyUseYears, normalizeEnergyUseSetup, reconcileEnergyUseSetup, removeEnergyUseYear, reviewEnergyUseYear } from '../../models/energy-use-setup.models';
import { EnergyUseUtilitySelection, EnergyUseMeterGroupSelection, previousEnergyUseYear } from '../../models/energy-use-settings.models';
import { manualUtilityMeterGroups, meterGroupSelectionCurrent, meterGroupSelectionUnchanged } from '../../models/energy-use-utility-selection.models';
import { EnergyUseWorkbenchHeaderService } from '../energy-use-workbench-header.service';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';

type Review = { readonly kind: 'source'; readonly item: IdbFacilityEnergyUseEquipment; readonly source: EquipmentUtilityData }
  | { readonly kind: 'utilities'; readonly item: IdbFacilityEnergyUseEquipment; readonly selection: EnergyUseUtilitySelection; readonly removed: readonly EquipmentUtilityData[]; readonly meterGroups?: EnergyUseMeterGroupSelection; readonly manualMeterGroups?: EnergyUseMeterGroupSelection }
  | { readonly kind: 'delete'; readonly item: IdbFacilityEnergyUseEquipment }
  | { readonly kind: 'year'; readonly item: IdbFacilityEnergyUseEquipment; readonly year: number; readonly draft: EnergyUseSetupValues };

interface DeletionRecovery {
  readonly key: string;
  readonly accountGuid: string;
  readonly destination: string[];
}

@Component({ selector: 'app-energy-use-settings', templateUrl: './energy-use-settings.component.html',
  styleUrls: ['./energy-use-settings.component.css'], standalone: false })
export class EnergyUseSettingsComponent implements OnDestroy {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService, { optional: true });
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly forms = inject(EnergyUseSetupFormService);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  readonly form = signal<EnergyUseSetupForm | undefined>(undefined);
  readonly refreshKey = signal(0);
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly review = signal<Review | undefined>(undefined);
  readonly deletionRecovery = signal<DeletionRecovery | undefined>(undefined);
  private portal?: TemplatePortal;
  private readonly changes = new Subject<EditSaveMode>();
  private subscription?: Subscription;
  private lastValue?: EnergyUseSetupValues;
  private approvals: EquipmentUtilityData[] = [];
  private yearApprovals: YearRemovalReview[] = [];
  readonly yearDrawer = signal<{ readonly copyFrom?: number } | undefined>(undefined);
  readonly yearError = signal('');
  readonly yearForm = new FormGroup({ year: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(9999)]) });
  private yearPortal?: TemplatePortal;
  @ViewChild('yearEditor') private readonly yearEditor?: TemplateRef<unknown>;
  private copyRequest?: IdbEntry;
  private alive = true;
  readonly item = computed(() => this.context.item()?.item);
  readonly identity = computed(() => ({ accountGuid: this.workspace.account()?.guid ?? '', facilityGuid: this.context.facilityGuid() ?? '', energyUseGuid: this.context.energyUseGuid() ?? '' }));
  readonly key = computed(() => { const value = this.identity(); return `${value.accountGuid}:${value.facilityGuid}:${value.energyUseGuid}`; });
  readonly saved = computed(() => { const item = this.item(); return item ? energyUseSetup(item) : undefined; });
  readonly facility = computed(() => this.workspace.facilities().find(facility => facility.guid === this.identity().facilityGuid));
  readonly editor = injectSettingsEditSession<EnergyUseSetupValues>({
    key: this.key, saved: this.saved, canWrite: computed(() => this.workspace.canWrite() && !this.busy() && !this.review() && !this.yearDrawer()),
    pendingOwners: computed(() => this.workspace.pendingOperations().map(operation => operation.ownerId)), changes: this.changes,
    read: () => this.forms.read(this.form()!), normalize: normalizeEnergyUseSetup, valid: () => !!this.form()?.valid,
    reconcile: reconcileEnergyUseSetup, hydrate: (value, mode) => this.hydrate(value, mode),
    persist: (value, base, ownerId) => this.actions.updateSetup(this.identity(), value, base, ownerId, { sources: this.approvals, years: this.yearApprovals }),
    setEnabled: enabled => { const form = this.form(); if (form) enabled ? form.enable({ emitEvent: false }) : form.disable({ emitEvent: false }); }
  });
  readonly canCommand = computed(() => !!this.item() && this.workspace.canWrite() && !this.workspace.hasPending() && !this.editor.saving() && !this.busy() && !this.deletionRecovery());
  readonly canManageYears = computed(() => this.canCommand() && this.editor.canEdit() && !!this.facility() && !this.review() && !this.yearDrawer());
  readonly showReadOnlyNotice = computed(() => !this.workspace.canWrite() && !this.editor.saving());
  readonly canLifecycle = computed(() => this.canCommand() && !this.editor.dirty() && ['idle', 'saved'].includes(this.editor.state()) && !!this.form()?.valid && !this.review() && !this.yearDrawer());
  readonly canCopy = computed(() => this.canCommand() && !this.editor.dirty() && !this.review());
  readonly removedSources = computed(() => {
    this.refreshKey();
    const values = this.form()?.controls.settings.getRawValue().sources ?? [];
    return this.item()?.utilityData.filter(row => !values.some(source => source.energySource === row.energySource)) ?? [];
  });
  private readonly utilityPolicy = computed(() => {
    this.refreshKey();
    const settings = this.form()?.controls.settings;
    return { owner: this.identity(), sources: settings?.controls.sources.getRawValue() ?? [],
      linkedIds: settings?.controls.utilityMeterGroupIds.value ?? [], groups: this.workspace.meterGroups(), meters: this.workspace.meters() };
  });
  readonly reviewStale = computed(() => {
    const review = this.review();
    this.refreshKey();
    if (!review) return false;
    if (!draftEqual(review.item, this.item())) return true;
    if (review.kind === 'year') {
      const form = this.form();
      return !form || !draftEqual(review.draft, normalizeEnergyUseSetup(this.forms.read(form)));
    }
    if (review.kind !== 'utilities') return false;
    const policy = this.utilityPolicy();
    const sourcesChanged = !draftEqual(review.selection.baseline, policy.sources);
    const meterGroupsChanged = !!review.meterGroups && !meterGroupSelectionCurrent(policy, review.meterGroups);
    const manualLinksChanged = !!review.manualMeterGroups && !draftEqual(review.manualMeterGroups, manualUtilityMeterGroups(policy, review.selection));
    return sourcesChanged || meterGroupsChanged || manualLinksChanged;
  });
  readonly utilityRemovalDetails = computed(() => {
    const review = this.review();
    return review?.kind === 'utilities' ? review.removed.map(source => ({ source: source.energySource,
      years: source.energyUse.map(row => `${row.year}${row.overrideEnergyUse ? ' (manual override)' : ''}`).join(', ') || 'No saved annual values' })) : [];
  });
  readonly unlinkedGroups = computed(() => {
    const review = this.review();
    if (review?.kind !== 'utilities' || !review.manualMeterGroups) return [];
    const { baseline, selected } = review.manualMeterGroups;
    return baseline.filter(guid => !selected.includes(guid)).map(guid => this.workspace.meterGroups().find(group => group.guid === guid)?.name || 'Unavailable meter group');
  });
  readonly removalYears = computed(() => { const review = this.review(); return review?.kind === 'source' ? review.source.energyUse.map(row => `${row.year}${row.overrideEnergyUse ? ' (manual override)' : ''}`).join(', ') || 'No saved annual values' : ''; });
  readonly saveMessage = computed(() => {
    this.refreshKey();
    switch (this.editor.state()) {
      case 'saving': return 'Saving setup…'; case 'saved': return 'Saved.';
      case 'error': return this.editor.error() || 'Setup could not be saved. Try again.';
      case 'invalid': return this.form()?.errors?.['energyUseSetup'] || 'Resolve validation issues before saving.';
      case 'conflict': return 'Saved setup changed. Review conflicting values before saving.';
      default: return 'Changes save automatically.';
    }
  });
  readonly setupValidation = computed(() => {
    this.refreshKey();
    const form = this.form();
    const value = form ? normalizeEnergyUseSetup(this.forms.read(form)) : this.saved();
    if (!value) return { label: 'Setup unavailable', tone: 'warning' as const, icon: 'warning' as const, description: 'The saved energy use is no longer available.' };
    const result = energyUseSetupValidation(value, this.item());
    if (form?.invalid && result.tone === 'success') return { label: 'Needs review', tone: 'warning' as const, icon: 'warning' as const,
      description: form.errors?.['energyUseSetup'] || 'Resolve validation issues before saving.' };
    return result;
  });
  @ViewChild('confirmation') private readonly confirmation?: TemplateRef<unknown>;
  constructor() {
    const unregisterHeader = this.header?.register({ key: this.key, state: this.editor.state, dirty: this.editor.dirty,
      blocked: computed(() => this.busy() || !!this.review() || !!this.yearDrawer() || !!this.deletionRecovery()), message: this.saveMessage,
      canRetry: computed(() => !this.editor.saving() && !!this.item() && this.workspace.canWrite()),
      retry: () => this.editor.retry() });
    if (unregisterHeader) inject(DestroyRef).onDestroy(unregisterHeader);
    registerDataDraft(signal(false), () => {}, computed(() => this.busy() || !!this.deletionRecovery() || (this.workspace.hasPending() && !this.editor.saving())));
    effect(() => {
      const key = this.key();
      untracked(() => {
        const recovery = this.deletionRecovery();
        if (recovery && recovery.key !== key) this.deletionRecovery.set(undefined);
      });
    });
    effect(() => {
      const saved = this.saved(), groups = this.workspace.meterGroups(), meters = this.workspace.meters(), form = this.form();
      if (form && saved) untracked(() => {
        this.forms.validate(form, saved, () => {
          const value = normalizeEnergyUseSetup(this.forms.read(form));
          const configurationChanged = !draftEqual(value.sources, saved.sources) || !draftEqual(value.utilityMeterGroupIds, saved.utilityMeterGroupIds);
          const linkError = configurationChanged ? energyUseMeterLinksError({ accountId: this.identity().accountGuid, facilityId: this.identity().facilityGuid,
            utilityData: value.sources.map(row => ({ ...row, energyUse: [] })), utilityMeterGroupIds: [...value.utilityMeterGroupIds] }, groups, meters) : undefined;
          return linkError ? { energyUseSetup: linkError } : null;
        });
        this.refreshKey.update(value => value + 1);
      });
    });
    effect(() => { const dirty = this.editor.dirty(), form = this.form(); if (form) untracked(() => dirty ? form.markAsDirty() : form.markAsPristine()); });
  }
  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.editor.saving() || this.busy() || !!this.deletionRecovery() || this.workspace.hasPending() || this.modal.workspaceBlocked(); }
  resolveConflicts(choices: ConflictChoices): void { this.editor.resolveConflicts(choices); }
  @HostListener('document:keydown', ['$event'])
  keyboardSave(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void this.editor.saveNow(); }
  }
  openYearDrawer(copyFrom?: number): void {
    const facility = this.facility();
    if (!this.canManageYears() || !this.yearEditor || !facility) return;
    const years = energyUseYears(this.forms.read(this.form()!));
    this.yearForm.reset({ year: years.length ? Math.min(9999, Math.max(...years) + 1) : previousEnergyUseYear(facility) });
    this.yearError.set(''); this.yearDrawer.set({ copyFrom });
    this.yearPortal = new TemplatePortal(this.yearEditor, this.view); this.modal.show(this.yearPortal);
  }
  closeYearDrawer(): void {
    if (this.yearPortal && this.modal.activePortal() === this.yearPortal) this.modal.hide();
    this.yearPortal = undefined; this.yearDrawer.set(undefined);
  }
  confirmYear(): void {
    const drawer = this.yearDrawer(), form = this.form(), facility = this.facility(), item = this.item();
    if (!drawer || !form || !facility || !item || !this.workspace.canWrite() || this.workspace.hasPending()) return;
    this.yearForm.markAllAsTouched();
    if (this.yearForm.invalid) return;
    try {
      const current = normalizeEnergyUseSetup(this.forms.read(form));
      const value = addEnergyUseYear(current, this.yearForm.controls.year.value!, facility,
        drawer.copyFrom === undefined ? undefined : { year: drawer.copyFrom, item });
      this.forms.hydrate(form, value, 'reconcile'); this.lastValue = this.forms.read(form);
      this.refreshKey.update(value => value + 1); this.closeYearDrawer(); this.changes.next('immediate');
    } catch (error) { this.yearError.set((error as Error).message); }
  }
  requestRemoveYear(year: number): void {
    const item = this.item(), form = this.form();
    if (item && form && this.canManageYears()) this.openReview({ kind: 'year', item: structuredClone(item), year, draft: normalizeEnergyUseSetup(this.forms.read(form)) });
  }
  requestUtilities(selection: EnergyUseUtilitySelection): void {
    const form = this.form(), item = this.item();
    if (!form || !item || !this.editor.canEdit()
      || !draftEqual(form.controls.settings.controls.sources.getRawValue(), selection.baseline)) return;
    const removed = item.utilityData.filter(source => !selection.selected.includes(source.energySource));
    const manualMeterGroups = manualUtilityMeterGroups(this.utilityPolicy(), selection);
    if (removed.length || manualMeterGroups) {
      this.openReview({ kind: 'utilities', item: structuredClone(item), selection: structuredClone(selection), removed: structuredClone(removed), manualMeterGroups });
    } else this.forms.settings.applyUtilities(form.controls.settings, selection);
  }
  requestMeterGroups(selection: EnergyUseMeterGroupSelection): void {
    const form = this.form(), item = this.item();
    const policy = this.utilityPolicy();
    if (!form || !item || !this.editor.canEdit() || !meterGroupSelectionCurrent(policy, selection)) return;
    if (meterGroupSelectionUnchanged(policy, selection.selected)) return;
    const removed = item.utilityData.filter(source => !selection.utilities.selected.includes(source.energySource));
    if (removed.length) {
      this.openReview({ kind: 'utilities', item: structuredClone(item), selection: structuredClone(selection.utilities),
        removed: structuredClone(removed), meterGroups: structuredClone(selection) });
    } else this.forms.settings.applyMeterGroups(form.controls.settings, selection);
  }
  requestRemoveSource(source: { energySource: MeterSource }): void {
    const item = this.item(), form = this.form();
    if (!item || !form || !this.editor.canEdit()) return;
    const rows = item.utilityData.filter(row => row.energySource === source.energySource);
    if (rows.length > 1) return;
    if (!rows.length) { this.removeSource(source.energySource); return; }
    this.openReview({ kind: 'source', item: structuredClone(item), source: structuredClone(rows[0]) });
  }
  requestDelete(): void { const item = this.item(); if (item && this.canCommand()) this.openReview({ kind: 'delete', item: structuredClone(item) }); }
  cancelReview(): void { if (!this.busy() && !this.deletionRecovery()) this.closeReview(); }
  async confirmReview(): Promise<void> {
    const review = this.review();
    if (!review || this.reviewStale() || !this.canCommand()) return;
    if (review.kind === 'year') {
      try {
        const value = removeEnergyUseYear(review.draft, review.year);
        this.yearApprovals = [...this.yearApprovals.filter(row => row.year !== review.year), reviewEnergyUseYear(review.item, review.year)];
        this.forms.hydrate(this.form()!, value, 'reconcile');
        this.lastValue = this.forms.read(this.form()!); this.refreshKey.update(value => value + 1);
        this.closeReview(); this.changes.next('immediate');
      } catch (error) { this.actionError.set((error as Error).message); }
      return;
    }
    if (review.kind === 'utilities') {
      const groups = review.meterGroups ?? review.manualMeterGroups;
      const applied = groups ? this.forms.settings.applyMeterGroups(this.form()!.controls.settings, groups) : this.forms.settings.applyUtilities(this.form()!.controls.settings, review.selection);
      if (!applied) return;
      this.approvals = [...this.approvals.filter(source => !review.removed.some(removed => removed.energySource === source.energySource)),
        ...structuredClone(review.removed)];
      this.closeReview(); this.changes.next('immediate'); return;
    }
    if (review.kind === 'source') {
      this.approvals = [...this.approvals.filter(row => row.energySource !== review.source.energySource), structuredClone(review.source)];
      this.removeSource(review.source.energySource); this.closeReview(); return;
    }
    const key = this.key(), identity = this.identity(), destination = this.context.routeAfterRemoval([review.item.guid]);
    this.busy.set(true); this.actionError.set('');
    try {
      await this.actions.delete(identity, review.item);
      if (!this.alive || key !== this.key()) return;
      await this.finishDeletion(key, destination);
    } catch (error) {
      if (this.alive && key === this.key()) {
        if (error instanceof WorkspaceWriteError && error.persistenceCommitted) {
          this.deletionRecovery.set({ key, accountGuid: identity.accountGuid, destination });
          this.actionError.set('The energy use was deleted, but the workspace could not refresh. Refresh saved changes to continue.');
        } else {
          this.actionError.set(error instanceof Error ? error.message : 'The energy use could not be deleted.');
        }
      }
    }
    finally { if (this.alive) this.busy.set(false); }
  }
  async recoverDeletion(): Promise<void> {
    const recovery = this.deletionRecovery();
    if (!recovery || this.busy() || recovery.key !== this.key() || recovery.accountGuid !== this.workspace.account()?.guid) return;
    this.busy.set(true);
    this.actionError.set('');
    try {
      await this.actions.recoverPublication(recovery.accountGuid);
      if (this.alive && recovery.key === this.key()) await this.finishDeletion(recovery.key, recovery.destination);
    } catch (error) {
      if (this.alive && recovery.key === this.key()) {
        this.actionError.set(error instanceof Error ? error.message : 'Refresh failed. The deletion will not be repeated.');
      }
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  private async finishDeletion(key: string, destination: string[]): Promise<void> {
    this.deletionRecovery.set(undefined);
    this.editor.discard();
    this.closeReview();
    this.busy.set(false);
    const opened = await this.context.navigate(destination);
    if (!opened && this.alive && key === this.key()) {
      this.actionError.set('Energy use deleted. Use Back to energy uses to return to the inventory.');
    }
  }
  async copy(): Promise<void> {
    if (!this.canCopy()) return;
    const key = this.key(), identity = this.identity(); this.busy.set(true); this.actionError.set('');
    try {
      this.copyRequest ??= getNewIdbEntry();
      const copy = await this.actions.copy(identity, this.copyRequest);
      this.copyRequest = undefined;
      if (!this.alive || key !== this.key()) return;
      this.busy.set(false);
      const opened = await this.router.navigate(facilityEnergyUseRoute(copy.facilityId, this.context.energyUseGroupGuid()!, copy.guid));
      if (opened === false) this.actionError.set('Energy use copied. Open its settings from the inventory.');
    } catch (error) { if (this.alive && key === this.key()) this.actionError.set(error instanceof Error ? error.message : 'The energy use could not be copied.'); }
    finally { if (this.alive) this.busy.set(false); }
  }
  ngOnDestroy(): void { this.alive = false; this.subscription?.unsubscribe(); this.closeReview(); this.closeYearDrawer(); }
  private removeSource(source: MeterSource): void {
    const array = this.form()!.controls.settings.controls.sources, index = array.controls.findIndex(row => row.controls.energySource.value === source);
    if (index >= 0) array.removeAt(index); else this.changes.next('immediate');
  }
  private openReview(review: Review): void {
    if (!this.confirmation) return;
    this.actionError.set(''); this.review.set(review);
    this.portal = new TemplatePortal(this.confirmation, this.view); this.modal.show(this.portal);
  }
  private closeReview(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.review.set(undefined);
  }
  private hydrate(value: EnergyUseSetupValues | undefined, mode: SettingsHydrationMode = 'reset'): void {
    if (!value) { this.subscription?.unsubscribe(); this.form.set(undefined); this.lastValue = undefined; this.approvals = []; return; }
    let form = this.form();
    if (!form) {
      form = this.forms.build(value); this.form.set(form);
      this.subscription = form.valueChanges.subscribe(() => {
        const facility = this.facility();
        if (facility) this.forms.synchronizeSources(form!, facility);
        const next = this.forms.read(form!), previous = this.lastValue; this.lastValue = next;
        this.refreshKey.update(value => value + 1);
        if (draftEqual(next, previous)) return;
        const immediate = !previous || next.equipmentType !== previous.equipmentType
          || !draftEqual(next.utilityMeterGroupIds, previous.utilityMeterGroupIds)
          || !draftEqual(next.sources.map(row => [row.energySource, row.units]), previous.sources.map(row => [row.energySource, row.units]))
          || !draftEqual(next.consumption.map(source => source.entries.map(row => [row.overrideEnergyUse, row.energyUseUnit])), previous.consumption.map(source => source.entries.map(row => [row.overrideEnergyUse, row.energyUseUnit])));
        this.changes.next(immediate ? 'immediate' : 'debounced');
      });
    }
    if (mode === 'reset') { this.approvals = []; this.yearApprovals = []; this.closeYearDrawer(); this.copyRequest = undefined; this.closeReview(); }
    this.forms.hydrate(form, value, mode); this.lastValue = this.forms.read(form); this.refreshKey.update(value => value + 1);
  }
}

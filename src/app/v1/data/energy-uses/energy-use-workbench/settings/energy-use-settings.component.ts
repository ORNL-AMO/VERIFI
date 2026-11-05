import { TemplatePortal } from '@angular/cdk/portal';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment, EquipmentUtilityData } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbEntry, getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { energyUseLinkedSources, energyUseMeterLinksError } from '@data/account-workspace/handlers/energy-use-command.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { ConflictChoices, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditSaveMode, SettingsHydrationMode, injectSettingsEditSession } from '@app/v1/data/editing/settings-edit-session';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUseSettingsForm, EnergyUseSettingsFormService } from '../../forms/energy-use-settings-form.service';
import { EnergyUseSettingsValues, EnergyUseUtilitySelection, EnergyUseMeterGroupSelection, defaultEnergyUseSource, energyUseSettings, energyUseSettingsError, normalizeEnergyUseSettings, reconcileEnergyUseSettings } from '../../models/energy-use-settings.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';

type Review = { readonly kind: 'source'; readonly item: IdbFacilityEnergyUseEquipment; readonly source: EquipmentUtilityData }
  | { readonly kind: 'utilities'; readonly item: IdbFacilityEnergyUseEquipment; readonly selection: EnergyUseUtilitySelection; readonly removed: readonly EquipmentUtilityData[]; readonly meterGroups?: EnergyUseMeterGroupSelection }
  | { readonly kind: 'delete'; readonly item: IdbFacilityEnergyUseEquipment };

@Component({ selector: 'app-energy-use-settings', templateUrl: './energy-use-settings.component.html',
  styleUrls: ['./energy-use-settings.component.css'], standalone: false })
export class EnergyUseSettingsComponent implements OnDestroy {
  readonly context = inject(EnergyUseWorkbenchContextService);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly forms = inject(EnergyUseSettingsFormService);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  readonly form = signal<EnergyUseSettingsForm | undefined>(undefined);
  readonly refreshKey = signal(0);
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly review = signal<Review | undefined>(undefined);
  private portal?: TemplatePortal;
  private readonly changes = new Subject<EditSaveMode>();
  private subscription?: Subscription;
  private lastValue?: EnergyUseSettingsValues;
  private approvals: EquipmentUtilityData[] = [];
  private copyRequest?: IdbEntry;
  private alive = true;
  readonly item = computed(() => this.workspace.energyUseEquipment().find(item => item.guid === this.context.energyUseGuid()
    && item.facilityId === this.context.facilityGuid() && item.accountId === this.workspace.account()?.guid));
  readonly identity = computed(() => ({ accountGuid: this.workspace.account()?.guid ?? '', facilityGuid: this.context.facilityGuid() ?? '', energyUseGuid: this.context.energyUseGuid() ?? '' }));
  readonly key = computed(() => { const value = this.identity(); return `${value.accountGuid}:${value.facilityGuid}:${value.energyUseGuid}`; });
  readonly saved = computed(() => { const item = this.item(); return item ? energyUseSettings(item) : undefined; });
  readonly facility = computed(() => this.workspace.facilities().find(facility => facility.guid === this.identity().facilityGuid));
  readonly group = computed(() => this.workspace.energyUseGroups().find(group => group.guid === this.item()?.energyUseGroupId && group.facilityId === this.identity().facilityGuid));
  readonly editor = injectSettingsEditSession<EnergyUseSettingsValues>({
    key: this.key, saved: this.saved, canWrite: computed(() => this.workspace.canWrite() && !this.busy() && !this.review()),
    pendingOwners: computed(() => this.workspace.pendingOperations().map(operation => operation.ownerId)), changes: this.changes,
    read: () => this.form()!.getRawValue(), normalize: normalizeEnergyUseSettings, valid: () => !!this.form()?.valid,
    reconcile: reconcileEnergyUseSettings, hydrate: (value, mode) => this.hydrate(value, mode),
    persist: (value, base, ownerId) => this.actions.updateSettings(this.identity(), value, base, ownerId, this.approvals),
    setEnabled: enabled => { const form = this.form(); if (form) enabled ? form.enable({ emitEvent: false }) : form.disable({ emitEvent: false }); }
  });
  readonly canCommand = computed(() => !!this.item() && this.workspace.canWrite() && !this.workspace.hasPending() && !this.editor.saving() && !this.busy());
  readonly canCopy = computed(() => this.canCommand() && !this.editor.dirty() && !this.review());
  readonly removedSources = computed(() => {
    this.refreshKey();
    const values = this.form()?.getRawValue().sources ?? [];
    return this.item()?.utilityData.filter(row => !values.some(source => source.energySource === row.energySource)) ?? [];
  });
  readonly reviewStale = computed(() => {
    const review = this.review(); this.refreshKey();
    return !!review && (!draftEqual(review.item, this.item()) || (review.kind === 'utilities'
      && (!draftEqual(review.selection.baseline, this.form()?.controls.sources.getRawValue())
        || (!!review.meterGroups && !this.meterGroupSelectionCurrent(review.meterGroups)))));
  });
  readonly utilityRemovalDetails = computed(() => {
    const review = this.review();
    return review?.kind === 'utilities' ? review.removed.map(source => ({ source: source.energySource,
      years: source.energyUse.map(row => `${row.year}${row.overrideEnergyUse ? ' (manual override)' : ''}`).join(', ') || 'No saved annual values' })) : [];
  });
  readonly removalYears = computed(() => { const review = this.review(); return review?.kind === 'source' ? review.source.energyUse.map(row => `${row.year}${row.overrideEnergyUse ? ' (manual override)' : ''}`).join(', ') || 'No saved annual values' : ''; });
  readonly saveMessage = computed(() => {
    this.refreshKey();
    switch (this.editor.state()) {
      case 'saving': return 'Saving settings…'; case 'saved': return 'Saved.';
      case 'error': return this.editor.error() || 'Settings could not be saved. Try again.';
      case 'invalid': return this.form()?.errors?.['energyUseSettings'] || 'Resolve validation issues before saving.';
      case 'conflict': return 'Saved settings changed. Review conflicting values before saving.';
      default: return 'Changes save automatically.';
    }
  });
  @ViewChild('confirmation') private readonly confirmation?: TemplateRef<unknown>;
  constructor() {
    registerDataDraft(signal(false), () => {}, computed(() => this.busy() || (this.workspace.hasPending() && !this.editor.saving())));
    effect(() => {
      const saved = this.saved(), groups = this.workspace.meterGroups(), meters = this.workspace.meters(), form = this.form();
      if (form && saved) untracked(() => {
        form.setValidators(() => {
          const value = normalizeEnergyUseSettings(form.getRawValue());
          const error = energyUseSettingsError(value, saved);
          const configurationChanged = !draftEqual(value.sources, saved.sources) || !draftEqual(value.utilityMeterGroupIds, saved.utilityMeterGroupIds);
          const linkError = configurationChanged ? energyUseMeterLinksError({ accountId: this.identity().accountGuid, facilityId: this.identity().facilityGuid,
            utilityData: value.sources.map(row => ({ ...row, energyUse: [] })), utilityMeterGroupIds: [...value.utilityMeterGroupIds] }, groups, meters) : undefined;
          return error || linkError ? { energyUseSettings: error || linkError } : null;
        });
        form.updateValueAndValidity({ emitEvent: false });
      });
    });
    effect(() => { const dirty = this.editor.dirty(), form = this.form(); if (form) untracked(() => dirty ? form.markAsDirty() : form.markAsPristine()); });
  }
  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.editor.saving() || this.busy() || this.workspace.hasPending(); }
  resolveConflicts(choices: ConflictChoices): void { this.editor.resolveConflicts(choices); }
  @HostListener('document:keydown', ['$event'])
  keyboardSave(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void this.editor.saveNow(); }
  }
  addSource(source: MeterSource): void {
    const form = this.form();
    if (!form || !this.editor.canEdit() || form.controls.sources.length >= 2 || form.controls.sources.getRawValue().some(row => row.energySource === source)) return;
    form.controls.sources.push(this.forms.source(defaultEnergyUseSource(source)));
  }
  requestUtilities(selection: EnergyUseUtilitySelection): void {
    const form = this.form(), item = this.item();
    if (!form || !item || !this.editor.canEdit() || form.controls.utilityMeterGroupIds.value.length
      || !draftEqual(form.controls.sources.getRawValue(), selection.baseline)) return;
    const removed = item.utilityData.filter(source => !selection.selected.includes(source.energySource));
    if (removed.length) {
      this.openReview({ kind: 'utilities', item: structuredClone(item), selection: structuredClone(selection), removed: structuredClone(removed) });
    } else this.forms.applyUtilities(form, selection);
  }
  requestMeterGroups(selection: EnergyUseMeterGroupSelection): void {
    const form = this.form(), item = this.item();
    if (!form || !item || !this.editor.canEdit() || !this.meterGroupSelectionCurrent(selection)) return;
    const unchangedLinks = draftEqual([...selection.baseline].sort(), [...selection.selected].sort());
    const unchangedUtilities = draftEqual(form.controls.sources.getRawValue().map(source => source.energySource).sort(), [...selection.utilities.selected].sort());
    if (unchangedLinks && (!selection.selected.length || unchangedUtilities)) return;
    const removed = item.utilityData.filter(source => !selection.utilities.selected.includes(source.energySource));
    if (removed.length) {
      this.openReview({ kind: 'utilities', item: structuredClone(item), selection: structuredClone(selection.utilities),
        removed: structuredClone(removed), meterGroups: structuredClone(selection) });
    } else this.forms.applyMeterGroups(form, selection);
  }
  private meterGroupSelectionCurrent(selection: EnergyUseMeterGroupSelection): boolean {
    if (!draftEqual(selection.baseline, this.form()?.controls.utilityMeterGroupIds.value)
      || !draftEqual(selection.utilities.baseline, this.form()?.controls.sources.getRawValue())) return false;
    const sources = energyUseLinkedSources(this.identity(), selection.selected, this.workspace.meters());
    if (!draftEqual([...sources].sort(), [...selection.utilities.selected].sort())) return false;
    return !energyUseMeterLinksError({ accountId: this.identity().accountGuid, facilityId: this.identity().facilityGuid,
      utilityMeterGroupIds: [...selection.selected], utilityData: sources.map(source => ({ ...defaultEnergyUseSource(source), energyUse: [] })) },
      this.workspace.meterGroups(), this.workspace.meters());
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
  cancelReview(): void { if (!this.busy()) this.closeReview(); }
  async confirmReview(): Promise<void> {
    const review = this.review();
    if (!review || this.reviewStale() || !this.canCommand()) return;
    if (review.kind === 'utilities') {
      const applied = review.meterGroups ? this.forms.applyMeterGroups(this.form()!, review.meterGroups) : this.forms.applyUtilities(this.form()!, review.selection);
      if (!applied) return;
      this.approvals = [...this.approvals.filter(source => !review.removed.some(removed => removed.energySource === source.energySource)),
        ...structuredClone(review.removed)];
      this.closeReview(); this.changes.next('immediate'); return;
    }
    if (review.kind === 'source') {
      this.approvals = [...this.approvals.filter(row => row.energySource !== review.source.energySource), structuredClone(review.source)];
      this.removeSource(review.source.energySource); this.closeReview(); return;
    }
    const key = this.key(), identity = this.identity();
    this.busy.set(true); this.actionError.set('');
    try {
      await this.actions.delete(identity, review.item);
      if (!this.alive || key !== this.key()) return;
      this.editor.discard(); this.closeReview(); this.busy.set(false);
      const opened = await this.navigation.openFacilityInventory(identity.facilityGuid, 'energy-uses');
      if (!opened) this.actionError.set('Energy use deleted. Use Back to energy uses to return to the inventory.');
    } catch (error) { if (this.alive && key === this.key()) this.actionError.set(error instanceof Error ? error.message : 'The energy use could not be deleted.'); }
    finally { if (this.alive) this.busy.set(false); }
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
      const opened = await this.router.navigate(facilityEnergyUseRoute(copy.facilityId, copy.guid, 'settings'));
      if (opened === false) this.actionError.set('Energy use copied. Open its settings from the inventory.');
    } catch (error) { if (this.alive && key === this.key()) this.actionError.set(error instanceof Error ? error.message : 'The energy use could not be copied.'); }
    finally { if (this.alive) this.busy.set(false); }
  }
  ngOnDestroy(): void { this.alive = false; this.subscription?.unsubscribe(); this.closeReview(); }
  private removeSource(source: MeterSource): void {
    const array = this.form()!.controls.sources, index = array.controls.findIndex(row => row.controls.energySource.value === source);
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
  private hydrate(value: EnergyUseSettingsValues | undefined, mode: SettingsHydrationMode = 'reset'): void {
    if (!value) { this.subscription?.unsubscribe(); this.form.set(undefined); this.lastValue = undefined; this.approvals = []; return; }
    let form = this.form();
    if (!form) {
      form = this.forms.build(value); this.form.set(form);
      this.subscription = form.valueChanges.subscribe(() => {
        const next = form!.getRawValue(), previous = this.lastValue; this.lastValue = next;
        this.refreshKey.update(value => value + 1);
        if (draftEqual(next, previous)) return;
        const immediate = !previous || next.equipmentType !== previous.equipmentType
          || !draftEqual(next.utilityMeterGroupIds, previous.utilityMeterGroupIds)
          || !draftEqual(next.sources.map(row => [row.energySource, row.units]), previous.sources.map(row => [row.energySource, row.units]));
        this.changes.next(immediate ? 'immediate' : 'debounced');
      });
    }
    if (mode === 'reset') { this.approvals = []; this.copyRequest = undefined; this.closeReview(); }
    this.forms.hydrate(form, value, mode); this.lastValue = form.getRawValue(); this.refreshKey.update(value => value + 1);
  }
}

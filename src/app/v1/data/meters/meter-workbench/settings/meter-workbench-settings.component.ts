import { injectSettingsEditSession, EditSaveMode } from '@app/v1/data/editing/settings-edit-session';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { MeterSettingsForm, MeterSettingsValues, readMeterSettings, normalizeMeterSettings } from '@app/v1/shared/meter-settings/meter-settings-values';
import { MeterSettingsActionsService } from '../../meter-settings-actions.service';
import { reconcileMeterSettings } from '../../meter-settings-editing';
import { canAssignSourceToGroup } from '../../models';
import { TemplatePortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterReadingDataApplication } from '@data/models/idbModels/utilityMeter';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterActionsService } from '../../meter-actions.service';
import { Subject, Subscription } from 'rxjs';
import {
  MeterSettingsFormService,
  MeterSettingsRuleChange,
  MeterSettingsRuleContext,
  MeterSettingsGroupingView,
  MeterSettingsViewModel
} from '@app/v1/shared/meter-settings/meter-settings-form.service';

@Component({
  selector: 'app-meter-workbench-settings',
  templateUrl: './meter-workbench-settings.component.html',
  styleUrls: ['./meter-workbench-settings.component.css'],
  standalone: false
})
export class MeterWorkbenchSettingsComponent implements AfterViewInit, OnDestroy, HasUnsavedChanges {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterWorkspace = inject(FacilityMetersWorkspaceService);
  private readonly formService = inject(MeterSettingsFormService);
  private readonly settingsActions = inject(MeterSettingsActionsService);
  private readonly actions = inject(MeterActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly route = inject(ActivatedRoute);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly account = this.meterWorkspace.account;
  readonly facility = this.meterWorkspace.facility;
  readonly meter = this.meterWorkspace.selectedMeter;
  readonly selectedMeterCard = this.meterWorkspace.selectedMeterCard;
  readonly selectedMeterData = this.meterWorkspace.selectedMeterData;
  readonly canWrite = this.meterWorkspace.canWrite;
  readonly hasPending = this.meterWorkspace.hasPending;
  readonly customFuels = this.workspace.customFuels;
  readonly customGWPs = this.workspace.customGWPs;
  readonly changingSetupValues = signal(false);
  private readonly edits = new Subject<EditSaveMode>();
  private readonly formRevision = signal(0);
  readonly formSignal = signal<MeterSettingsForm | undefined>(undefined);
  private formSubscription?: Subscription;
  private pendingMode: EditSaveMode = 'debounced';
  private queuedForm?: MeterSettingsForm;
  private destroyed = false;
  private currentMeterKey: string | undefined;
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly calendarizationHelpOpen = signal(false);
  readonly meterDataExists = computed(() => this.selectedMeterData().length > 0);
  readonly grouping = computed(() => {
    this.formRevision();
    const form = this.formSignal();
    return form ? this.groupingFor(form) : undefined;
  });
  readonly session = injectSettingsEditSession<MeterSettingsValues>({
    key: computed(() => [this.account()?.guid, this.facility()?.guid, this.meterWorkspace.selectedMeterGuid()].join('/')),
    saved: computed(() => { const meter = this.meter(); return meter ? readMeterSettings(meter) : undefined; }),
    canWrite: this.canWrite,
    pendingOwners: computed(() => this.workspace.pendingOperations().map(operation => operation.ownerId)),
    changes: this.edits,
    read: () => this.formSignal()?.getRawValue(),
    hydrate: value => this.hydrate(value),
    normalize: normalizeMeterSettings,
    valid: () => { const form = this.formSignal(); form?.updateValueAndValidity({ emitEvent: false }); return !!form && form.valid; },
    reconcile: reconcileMeterSettings,
    persist: (value, baseline, ownerId) => this.settingsActions.updateSettings({ accountGuid: this.account().guid, facilityGuid: this.facility().guid, meterGuid: this.meter().guid }, value, baseline, ownerId),
    setEnabled: enabled => this.applyFormEnabledState(enabled)
  });
  readonly saveState = this.session.state;
  readonly saveMessage = computed(() => ({ idle: 'Changes save automatically.', dirty: 'Changes save automatically.', saving: 'Saving settings...', saved: 'Saved.', invalid: this.grouping()?.error ? 'Choose a compatible meter group to save.' : 'Resolve validation issues before these settings can be saved.', error: this.session.error() || 'Settings could not be saved. Try again.', conflict: 'Review changes to these settings before saving.' }[this.saveState()]));
  readonly savingOwnChanges = this.session.saving;
  readonly canEditForm = this.session.canEdit;
  readonly canDeleteMeter = computed(() => !!this.meter() && this.canWrite() && !this.hasPending() && !this.savingOwnChanges() && !this.deleting());
  readonly showReadOnlyNotice = computed(() => !this.canWrite() && !this.savingOwnChanges());
  readonly viewModel = computed((): MeterSettingsViewModel | undefined => {
    const form = this.formSignal();
    this.formRevision();
    const context = this.context();
    return form && context ? this.formService.buildMeterSettingsViewModel(form, context) : undefined;
  });

  private deleteModalOpen = false;

  @ViewChild('deleteMeterConfirmModal') private readonly deleteMeterConfirmModal?: TemplateRef<unknown>;

  ngAfterViewInit(): void {
    this.scrollToFragment(this.route.snapshot.fragment);
  }

  private readonly enabledStateEffect = effect(() => {
    this.canEditForm();
    this.savingOwnChanges();
    this.meterDataExists();
    this.changingSetupValues();
    this.workspace.meterGroups();
    untracked(() => this.applyFormEnabledState());
  });

  ngOnDestroy(): void {
    this.destroyed = true;
    this.formSubscription?.unsubscribe();
    this.hideDeleteModal();
  }

  onImmediateChange(kind?: MeterSettingsRuleChange): void {
    this.pendingMode = 'immediate';
    if (kind) this.applyRuleChange(kind);
  }

  onRuleChange(kind: MeterSettingsRuleChange): void {
    this.applyRuleChange(kind);
  }

  enableSetupChanges(): void {
    this.changingSetupValues.set(true);
    this.applyFormEnabledState();
  }

  requestDeleteMeter(): void {
    const template = this.deleteMeterConfirmModal;
    if (!this.canDeleteMeter() || !template) {
      return;
    }
    this.deleteError.set(undefined);
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }

  openCalendarizationHelp(): void {
    this.calendarizationHelpOpen.set(true);
  }

  closeCalendarizationHelp(): void {
    this.calendarizationHelpOpen.set(false);
  }

  changeCalendarizationMethodFromSlideout(method: MeterReadingDataApplication): void {
    const form = this.formSignal();
    if (!form || !this.canEditForm() || form.controls.meterReadingDataApplication.value === method) {
      return;
    }
    form.controls.meterReadingDataApplication.patchValue(method);
    form.controls.meterReadingDataApplication.markAsTouched();
    form.markAsDirty();
    this.pendingMode = 'immediate';
  }

  toggleNoLongerInUse(): void {
    const form = this.formSignal();
    if (!form || !this.canEditForm()) {
      return;
    }
    form.controls.noLongerInUse.patchValue(!form.controls.noLongerInUse.value);
    form.markAsDirty();
    this.pendingMode = 'immediate';
  }

  cancelDeleteMeter(): void {
    if (!this.deleting()) {
      this.hideDeleteModal();
      this.deleteError.set(undefined);
    }
  }

  async confirmDeleteMeter(): Promise<void> {
    const meter = this.meter();
    const facility = this.facility();
    if (!meter || !facility || !this.canDeleteMeter()) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(undefined);
    try {
      await this.actions.deleteMeter(meter);
      this.session.discard();
      this.hideDeleteModal();
      this.deleting.set(false);
      await this.navigation.openFacilityInventory(facility.guid, 'meters');
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The meter could not be deleted.');
    } finally {
      this.deleting.set(false);
    }
  }

  async saveNow(): Promise<void> {
    this.formSignal()?.markAllAsTouched();
    await this.session.saveNow();
  }

  hasUnsavedChanges(): boolean { return this.session.dirty(); }
  isNavigationBlocked(): boolean { return this.session.saving() || this.deleting(); }

  private hydrate(values: MeterSettingsValues | undefined): void {
    const meter = this.meter();
    if (!values || !meter) { this.formSubscription?.unsubscribe(); this.formSignal.set(undefined); this.currentMeterKey = undefined; return; }
    const key = [this.account()?.guid, this.facility()?.guid, meter.guid].join('/');
    let form = this.formSignal();
    if (!form || this.currentMeterKey !== key) {
      this.currentMeterKey = key;
      this.changingSetupValues.set(false);
      form = this.formService.buildMeterSettingsForm(meter);
      const activeForm = form;
      form.addValidators(() => this.groupingFor(activeForm).error ? { meterGroupIncompatible: true } : null);
      this.formService.hydrate(form, values);
      this.formSubscription?.unsubscribe();
      this.queuedForm = undefined; this.pendingMode = 'debounced';
      this.formSignal.set(form);
      this.formSubscription = form.valueChanges.subscribe(() => this.queueFormEdit(form));
    } else this.formService.hydrate(form, values);
    this.formRevision.update(value => value + 1);
  }

  private queueFormEdit(form: MeterSettingsForm): void {
    this.formRevision.update(value => value + 1);
    if (this.queuedForm === form) return;
    this.queuedForm = form;
    queueMicrotask(() => {
      if (this.queuedForm !== form) return;
      this.queuedForm = undefined;
      if (this.destroyed || this.formSignal() !== form) return;
      const mode = this.pendingMode; this.pendingMode = 'debounced';
      this.formRevision.update(value => value + 1);
      this.edits.next(mode);
    });
  }

  private groupingFor(form: MeterSettingsForm): MeterSettingsGroupingView {
    const groups = this.workspace.meterGroups().filter(group => group.accountId === this.account()?.guid
      && group.facilityId === this.facility()?.guid);
    const source = form.controls.source.value;
    const groupId = form.controls.groupId.value;
    const selected = groups.find(group => group.guid === groupId);
    const incompatible = !!groupId && (!selected || !canAssignSourceToGroup(source, selected));
    const error = incompatible ? selected
      ? `The “${selected.name}” ${selected.groupType.toLowerCase()} meter group cannot contain ${source} meters. Choose a compatible group or Ungrouped.`
      : 'The assigned meter group is no longer available. Choose a compatible group or Ungrouped.' : undefined;
    return {
      options: [
        ...(incompatible ? [{ value: groupId, label: `${selected?.name ?? 'Unavailable group'} (incompatible)`, disabled: true }] : []),
        { value: null, label: 'Ungrouped' },
        ...groups.filter(group => canAssignSourceToGroup(source, group))
          .sort((first, second) => first.name.localeCompare(second.name))
          .map(group => ({ value: group.guid, label: group.name }))
      ],
      error
    };
  }

  private hideDeleteModal(): void {
    if (this.deleteModalOpen) {
      this.deleteModalOpen = false;
      this.modalPortal.hide();
    }
  }

  private scrollToFragment(fragment: string | null): void {
    if (!fragment) {
      return;
    }
    setTimeout(() => {
      document.getElementById(fragment)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  private applyRuleChange(kind: MeterSettingsRuleChange): void {
    const form = this.formSignal();
    const context = this.context();
    if (!form || !context) {
      return;
    }
    this.formService.applyMeterSettingsRuleChange(kind, form, context);
    this.applyFormEnabledState();
  }

  private context(): MeterSettingsRuleContext | undefined {
    const facility = this.facility();
    const account = this.account();
    if (!facility || !account) {
      return undefined;
    }
    return {
      facility,
      account,
      customFuels: this.customFuels(),
      customGWPs: this.customGWPs(),
      meterDataExists: this.meterDataExists()
    };
  }

  private applyFormEnabledState(enabled = this.canEditForm()): void {
    const form = this.formSignal();
    if (!form) {
      return;
    }
    if (!enabled) {
      form.disable({ emitEvent: false });
      return;
    }
    form.enable({ emitEvent: false });
    if (this.meterDataExists() && !this.changingSetupValues()) {
      [
        'source',
        'startingUnit',
        'energyUnit',
        'scope',
        'fuel',
        'phase',
        'heatCapacity',
        'siteToSource',
        'waterIntakeType',
        'waterDischargeType',
        'vehicleCategory',
        'vehicleType',
        'vehicleCollectionType',
        'vehicleCollectionUnit',
        'vehicleFuel',
        'vehicleFuelEfficiency',
        'vehicleDistanceUnit'
      ].forEach(controlName => form.controls[controlName]?.disable({ emitEvent: false }));
    }
  }
}

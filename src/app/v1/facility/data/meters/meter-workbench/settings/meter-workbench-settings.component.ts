import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { updateMeterDataCharges } from '@data/models/idbModels/utilityMeterData';
import { ModalPortalService } from '../../../../../shell/modal-portal.service';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MetersDashboardActionsService } from '../../meters-dashboard/meters-dashboard-actions.service';
import {
  MeterSettingsFormService,
  MeterSettingsRuleChange,
  MeterSettingsRuleContext,
  MeterSettingsViewModel
} from './meter-settings-form.service';

export type MeterSettingsSaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid';

@Component({
  selector: 'app-meter-workbench-settings',
  templateUrl: './meter-workbench-settings.component.html',
  styleUrls: ['./meter-workbench-settings.component.css'],
  standalone: false
})
export class MeterWorkbenchSettingsComponent implements OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterWorkspace = inject(FacilityMetersWorkspaceService);
  private readonly formService = inject(MeterSettingsFormService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly meterHandler = inject(MeterCommandHandler);
  private readonly actions = inject(MetersDashboardActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
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
  readonly saveState = signal<MeterSettingsSaveState>('idle');
  readonly saveMessage = signal('Changes save automatically.');
  readonly formSignal = signal<FormGroup | undefined>(undefined);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly meterDataExists = computed(() => this.selectedMeterData().length > 0);
  readonly savingOwnChanges = computed(() => this.saveState() === 'saving');
  readonly canEditForm = computed(() => this.canWrite() || this.savingOwnChanges());
  readonly canDeleteMeter = computed(() => !!this.meter() && this.canWrite() && !this.hasPending() && !this.savingOwnChanges() && !this.deleting());
  readonly showReadOnlyNotice = computed(() => !this.canWrite() && !this.savingOwnChanges());
  readonly viewModel = computed((): MeterSettingsViewModel | undefined => {
    const form = this.formSignal();
    const context = this.context();
    return form && context ? this.formService.buildMeterSettingsViewModel(form, context) : undefined;
  });

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private currentMeterGuid: string | undefined;
  private skipNextWorkspaceRefresh = false;
  private deleteModalOpen = false;

  @ViewChild('deleteMeterConfirmModal') private readonly deleteMeterConfirmModal?: TemplateRef<unknown>;

  private readonly rebuildEffect = effect(() => {
    const meter = this.meter();
    const guid = meter?.guid;
    this.selectedMeterData();
    if (!meter) {
      this.currentMeterGuid = undefined;
      this.formSignal.set(undefined);
      return;
    }
    if (guid === this.currentMeterGuid && this.formSignal()) {
      this.skipNextWorkspaceRefresh = false;
      untracked(() => this.applyFormEnabledState());
      return;
    }
    this.currentMeterGuid = guid;
    this.changingSetupValues.set(false);
    this.saveState.set('idle');
    this.saveMessage.set('Changes save automatically.');
    const form = this.formService.buildMeterSettingsForm(meter);
    this.formSignal.set(form);
    this.applyRuleChange('source', false);
    form.markAsPristine();
    untracked(() => this.applyFormEnabledState());
  });
  private readonly enabledStateEffect = effect(() => {
    this.canEditForm();
    this.savingOwnChanges();
    this.meterDataExists();
    this.changingSetupValues();
    untracked(() => this.applyFormEnabledState());
  });

  ngOnDestroy(): void {
    this.clearDebounce();
    this.hideDeleteModal();
  }

  onTextChange(): void {
    this.formSignal()?.markAsDirty();
    this.scheduleSave();
  }

  onImmediateChange(kind?: MeterSettingsRuleChange): void {
    if (kind) {
      this.applyRuleChange(kind, true);
    }
    this.formSignal()?.markAsDirty();
    void this.saveNow();
  }

  onRuleChange(kind: MeterSettingsRuleChange): void {
    this.applyRuleChange(kind, true);
    this.formSignal()?.markAsDirty();
    this.scheduleSave();
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
    this.clearDebounce();
    try {
      await this.actions.deleteMeter(meter);
      this.hideDeleteModal();
      await this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'meters'));
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The meter could not be deleted.');
    } finally {
      this.deleting.set(false);
    }
  }

  async saveNow(): Promise<void> {
    this.clearDebounce();
    const form = this.formSignal();
    const account = this.account();
    const meter = this.meter();
    if (!form || !account || !meter || !this.canEditForm() || form.pristine) {
      return;
    }
    if (form.invalid) {
      form.markAllAsTouched();
      this.saveState.set('invalid');
      this.saveMessage.set('Resolve validation issues before these settings can be saved.');
      return;
    }
    const updatedMeter = this.formService.updateMeterFromSettingsForm(structuredClone(meter), form);
    this.saveState.set('saving');
    this.saveMessage.set('Saving settings...');
    try {
      const meterDataUpdates = updateMeterDataCharges(updatedMeter, structuredClone(this.selectedMeterData()));
      await this.commandBoundary.execute(
        {
          entityKind: 'meter',
          changeKind: 'update',
          entityGuid: updatedMeter.guid,
          label: 'Saving meter settings',
          notification: { suppressSuccessToast: true },
          publication: { mode: 'reload' }
        },
        () => this.meterHandler.updateMeterWithData(updatedMeter, meterDataUpdates, account.guid)
      );
      this.skipNextWorkspaceRefresh = true;
      form.markAsPristine();
      this.saveState.set('saved');
      this.saveMessage.set('Saved.');
    } catch {
      this.saveState.set('error');
      this.saveMessage.set('Settings could not be saved. Try again.');
    }
  }

  private scheduleSave(): void {
    this.clearDebounce();
    this.saveState.set('idle');
    this.saveMessage.set('Changes save automatically.');
    this.debounceTimer = setTimeout(() => void this.saveNow(), 650);
  }

  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  private hideDeleteModal(): void {
    if (this.deleteModalOpen) {
      this.deleteModalOpen = false;
      this.modalPortal.hide();
    }
  }

  private applyRuleChange(kind: MeterSettingsRuleChange, saveUserChange: boolean): void {
    const form = this.formSignal();
    const context = this.context();
    if (!form || !context) {
      return;
    }
    this.formService.applyMeterSettingsRuleChange(kind, form, context);
    this.applyFormEnabledState();
    if (saveUserChange) {
      this.viewModel();
    }
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

  private applyFormEnabledState(): void {
    const form = this.formSignal();
    if (!form) {
      return;
    }
    if (!this.canEditForm()) {
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

import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { MeterSettingsForm } from '@app/v1/shared/meter-settings/meter-settings-values';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import {
  MeterSettingsFormService,
  MeterSettingsRuleChange,
  MeterSettingsRuleContext,
  MeterSettingsViewModel
} from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { MeterSettingsModule } from '@app/v1/shared/meter-settings/meter-settings.module';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

export interface ImportMeterEditResult {
  readonly originalGuid: string;
  readonly meter: IdbUtilityMeter;
}

@Component({
  selector: 'app-import-meter-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MeterSettingsModule, TooltipComponent, WorkspaceSlideoutComponent, ConfirmationDialogComponent],
  templateUrl: './import-meter-editor.component.html',
  styleUrls: ['./import-meter-editor.component.css']
})
export class ImportMeterEditorComponent implements OnChanges, OnDestroy {
  private readonly formService = inject(MeterSettingsFormService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  @ViewChild('discardMeterConfirmation') private readonly discardTemplate?: TemplateRef<unknown>;
  private discardPromise?: Promise<boolean>;
  private discardResolver?: (confirmed: boolean) => void;
  private replacementVersion = 0;
  private destroyed = false;

  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) facility: IdbFacility;
  @Input({ required: true }) account: IdbAccount;
  @Input() customFuels: readonly IdbCustomFuel[] = [];
  @Input() customGWPs: readonly IdbCustomGWP[] = [];
  @Input() existingMeters: readonly IdbUtilityMeter[] = [];
  @Input() metersWithPersistedReadings: readonly string[] = [];
  @Output() saved = new EventEmitter<ImportMeterEditResult>();
  @Output() cancelled = new EventEmitter<void>();

  form: MeterSettingsForm;
  viewModel: MeterSettingsViewModel;
  saveMessage = 'Changes are applied to this upload when you save.';
  setupUnlocked = false;
  private originalGuid: string;
  workingMeter: IdbUtilityMeter;
  readonly existingMeterControl = new FormControl<string | null>(null);

  constructor() {
    this.existingMeterControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => { void this.selectExisting(value); });
  }

  get hasPersistedReadings(): boolean {
    return !!this.workingMeter && this.metersWithPersistedReadings.includes(this.workingMeter.guid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meter'] && this.meter) {
      if (!this.workingMeter || this.originalGuid !== this.meter.guid || !this.form.dirty) {
        this.originalGuid = this.meter.guid;
        this.setWorkingMeter(this.meter);
      }
    }
    if (this.form && (changes['facility'] || changes['account'] || changes['customFuels'] || changes['customGWPs'] || changes['metersWithPersistedReadings'])) {
      this.refreshViewModel(); this.applyEnabledState();
    }
  }

  async selectExisting(guid: string | null): Promise<void> {
    const version = ++this.replacementVersion;
    if (this.form.dirty && !await this.confirmDiscard()) {
      if (!this.destroyed && version === this.replacementVersion) this.existingMeterControl.setValue(this.workingMeter.guid === this.meter.guid ? null : this.workingMeter.guid, { emitEvent: false });
      return;
    }
    if (this.destroyed || version !== this.replacementVersion) return;
    if (!guid) {
      this.setWorkingMeter(this.meter);
      return;
    }
    const existing = this.existingMeters.find(candidate => candidate.guid === guid);
    if (!existing) return;
    const importWizardName = this.workingMeter.importWizardName;
    const skipImport = this.workingMeter.skipImport;
    this.setWorkingMeter({ ...structuredClone(existing), importWizardName, skipImport });
  }

  async requestClose(): Promise<void> {
    if (this.form?.dirty && !await this.confirmDiscard()) return;
    if (!this.destroyed) this.cancelled.emit();
  }
  private confirmDiscard(): Promise<boolean> {
    if (this.destroyed || !this.discardTemplate) return Promise.resolve(false);
    if (this.discardPromise) return this.discardPromise;
    this.discardPromise = new Promise(resolve => { this.discardResolver = resolve; });
    this.modalPortal.show(new TemplatePortal(this.discardTemplate, this.viewContainer));
    return this.discardPromise;
  }
  resolveDiscard(confirmed: boolean): void {
    const resolve = this.discardResolver;
    if (!resolve) return;
    this.discardResolver = undefined; this.discardPromise = undefined;
    this.modalPortal.hide(); resolve(confirmed);
  }
  ngOnDestroy(): void { this.destroyed = true; this.resolveDiscard(false); }

  onRuleChange(kind: MeterSettingsRuleChange): void {
    this.formService.applyMeterSettingsRuleChange(kind, this.form, this.context());
    this.refreshViewModel();
  }

  onImmediateChange(kind?: MeterSettingsRuleChange): void {
    if (kind) this.formService.applyMeterSettingsRuleChange(kind, this.form, this.context());
    this.form.markAsDirty();
    this.refreshViewModel();
  }

  onTextChange(): void {
    this.form.markAsDirty();
  }

  unlockSetup(): void {
    this.setupUnlocked = true;
    this.applyEnabledState();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveMessage = 'Resolve validation issues before saving this meter.';
      return;
    }
    const updated = this.formService.updateMeterFromSettingsForm(structuredClone(this.workingMeter), this.form);
    this.saved.emit({ originalGuid: this.originalGuid, meter: updated });
  }

  private setWorkingMeter(meter: IdbUtilityMeter): void {
    this.workingMeter = structuredClone(meter);
    this.setupUnlocked = false;
    this.form = this.formService.buildMeterSettingsForm(this.workingMeter);
    this.existingMeterControl.setValue(this.workingMeter.guid === this.meter.guid ? null : this.workingMeter.guid, { emitEvent: false });
    this.refreshViewModel();
    this.applyEnabledState();
    this.saveMessage = 'Changes are applied to this upload when you save.';
  }

  private refreshViewModel(): void {
    this.viewModel = this.formService.buildMeterSettingsViewModel(this.form, this.context());
  }

  private context(): MeterSettingsRuleContext {
    return {
      facility: this.facility,
      account: this.account,
      customFuels: this.customFuels,
      customGWPs: this.customGWPs,
      meterDataExists: this.hasPersistedReadings
    };
  }

  private applyEnabledState(): void {
    this.form.enable({ emitEvent: false });
    if (this.hasPersistedReadings && !this.setupUnlocked) {
      [
        'source', 'startingUnit', 'energyUnit', 'scope', 'fuel', 'phase', 'heatCapacity',
        'siteToSource', 'waterIntakeType', 'waterDischargeType', 'vehicleCategory',
        'vehicleType', 'vehicleCollectionType', 'vehicleCollectionUnit', 'vehicleFuel',
        'vehicleFuelEfficiency', 'vehicleDistanceUnit'
      ].forEach(controlName => this.form.controls[controlName]?.disable({ emitEvent: false }));
    }
  }
}

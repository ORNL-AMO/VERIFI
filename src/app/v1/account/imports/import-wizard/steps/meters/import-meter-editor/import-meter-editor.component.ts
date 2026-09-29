import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, MeterSettingsModule, TooltipComponent, WorkspaceSlideoutComponent],
  templateUrl: './import-meter-editor.component.html',
  styleUrls: ['./import-meter-editor.component.css']
})
export class ImportMeterEditorComponent implements OnChanges {
  private readonly formService = inject(MeterSettingsFormService);

  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) facility: IdbFacility;
  @Input({ required: true }) account: IdbAccount;
  @Input() customFuels: readonly IdbCustomFuel[] = [];
  @Input() customGWPs: readonly IdbCustomGWP[] = [];
  @Input() existingMeters: readonly IdbUtilityMeter[] = [];
  @Input() metersWithPersistedReadings: readonly string[] = [];
  @Output() saved = new EventEmitter<ImportMeterEditResult>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  viewModel: MeterSettingsViewModel;
  saveMessage = 'Changes are applied to this import when you save.';
  setupUnlocked = false;
  private originalGuid: string;
  workingMeter: IdbUtilityMeter;

  get hasPersistedReadings(): boolean {
    return !!this.workingMeter && this.metersWithPersistedReadings.includes(this.workingMeter.guid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meter'] && this.meter) {
      this.originalGuid = this.meter.guid;
      this.setWorkingMeter(this.meter);
    }
  }

  selectExisting(event: Event): void {
    const guid = (event.target as HTMLSelectElement).value;
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
    this.refreshViewModel();
    this.applyEnabledState();
    this.saveMessage = 'Changes are applied to this import when you save.';
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

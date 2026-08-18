import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { AllSources, MeterPhase, MeterSource, WaterDischargeTypes, WaterIntakeTypes } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { ScopeOptions } from 'src/app/models/scopeOption';
import { getFuelTypeOptions } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { EnergyUnitOptions, DemandUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource,
  getHeatingCapacity,
  getIsEnergyMeter,
  getIsEnergyUnit,
  getSiteToSource,
  getStartingUnitOptions,
  getGUID
} from 'src/app/shared/sharedHelperFunctions';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-p1-facility-meter-setup',
  templateUrl: './meter-setup.component.html',
  styleUrls: ['./meter-setup.component.css'],
  standalone: false
})
export class P1FacilityMeterSetupComponent implements OnChanges {
  private readonly editMeterFormService = inject(EditMeterFormService);
  private readonly workspace = inject(AccountWorkspaceStore);

  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) facility: IdbFacility;
  @Input() meterDataExists = false;
  @Input() canWrite = false;
  @Input() groups: IdbUtilityMeterGroup[] = [];
  @Output() saveMeter = new EventEmitter<IdbUtilityMeter>();
  @Output() saveGroupAssignment = new EventEmitter<string | undefined>();
  @Output() openAnalysisGroups = new EventEmitter<void>();

  form: FormGroup;
  private currentMeterGuid?: string;
  readonly sources = AllSources;
  readonly phases: MeterPhase[] = ['Gas', 'Liquid', 'Solid'];
  readonly scopes = ScopeOptions;
  readonly energyUnits = EnergyUnitOptions;
  readonly demandUnits = DemandUnitOptions;
  readonly waterIntakeTypes = WaterIntakeTypes;
  readonly waterDischargeTypes = WaterDischargeTypes;
  readonly months = Months;
  readonly years = Array.from({ length: new Date().getFullYear() - 1999 }, (_, index) => new Date().getFullYear() - index);
  fuelOptions: FuelTypeOption[] = [];
  startingUnitOptions: UnitOption[] = [];
  unitsUnlocked = false;

  ngOnChanges(): void {
    if (!this.meter || !this.facility) {
      return;
    }
    if (!this.form || this.currentMeterGuid !== this.meter.guid) {
      this.form = this.editMeterFormService.getFormFromMeter(structuredClone(this.meter));
      this.currentMeterGuid = this.meter.guid;
      this.unitsUnlocked = false;
      this.applyExistingDataLocks();
    }
    this.syncOptions(true);
  }

  get chargesArray(): FormArray {
    return this.form.get('chargesArray') as FormArray;
  }

  get displayFuel(): boolean {
    return this.source === 'Other Fuels' || this.source === 'Other Energy';
  }

  get displayPhase(): boolean {
    return this.source === 'Other Fuels';
  }

  get displayScope(): boolean {
    return this.source !== 'Water Intake' && this.source !== 'Water Discharge';
  }

  get displayWaterIntake(): boolean {
    return this.source === 'Water Intake';
  }

  get displayWaterDischarge(): boolean {
    return this.source === 'Water Discharge';
  }

  get displayHeatCapacity(): boolean {
    return checkShowHeatCapacity(this.source, this.form.controls.startingUnit.value, this.form.controls.scope.value);
  }

  get displaySiteToSource(): boolean {
    return checkShowSiteToSource(this.source, this.form.controls.includeInEnergy.value, this.form.controls.scope.value);
  }

  get isEnergyMeter(): boolean {
    return getIsEnergyMeter(this.source);
  }

  get collectionUnitIsEnergy(): boolean {
    return getIsEnergyUnit(this.form.controls.startingUnit.value);
  }

  get source(): MeterSource {
    return this.form?.controls.source.value;
  }

  changeSource(): void {
    this.form.controls.scope.patchValue(this.editMeterFormService.getDefaultScope(this.source));
    this.form.controls.energyUnit.patchValue(this.source === 'Electricity' ? 'kWh' : this.facility.energyUnit);
    this.syncOptions(false);
    this.patchDefaultStartingUnit();
    this.syncValidators();
    this.patchDerivedValues();
  }

  changeScope(): void {
    this.syncOptions(false);
    this.syncValidators();
    this.patchDerivedValues();
  }

  changePhaseOrFuel(): void {
    this.syncOptions(false);
    this.patchDefaultStartingUnit();
    this.syncValidators();
    this.patchDerivedValues();
  }

  changeUnits(): void {
    this.syncOptions(true);
    this.syncValidators();
    this.patchDerivedValues();
  }

  unlockUnitChanges(): void {
    this.unitsUnlocked = true;
    [
      'source',
      'startingUnit',
      'phase',
      'fuel',
      'heatCapacity',
      'energyUnit',
      'scope',
      'waterIntakeType',
      'waterDischargeType',
      'vehicleCategory',
      'vehicleType',
      'vehicleCollectionType',
      'vehicleCollectionUnit',
      'vehicleFuel',
      'vehicleFuelEfficiency',
      'vehicleDistanceUnit'
    ].forEach(control => this.form.controls[control]?.enable());
  }

  addCharge(): void {
    this.editMeterFormService.addCharge(this.form);
    this.form.markAsDirty();
  }

  removeCharge(index: number): void {
    this.chargesArray.removeAt(index);
    this.form.markAsDirty();
  }

  currentGroup(): IdbUtilityMeterGroup | undefined {
    return this.groups.find(group => group.guid === this.meter.groupId);
  }

  eligibleGroups(): IdbUtilityMeterGroup[] {
    return this.groups
      .filter(group => this.meterCanUseGroup(group) || group.guid === this.meter.groupId)
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  meterCanUseGroup(group: IdbUtilityMeterGroup): boolean {
    if (group.groupType === 'Energy') {
      return getIsEnergyMeter(this.meter.source);
    }
    if (group.groupType === 'Water') {
      return this.meter.source === 'Water Intake' || this.meter.source === 'Water Discharge';
    }
    return true;
  }

  selectGroup(groupId: string | undefined): void {
    if (!this.canWrite || this.meter.groupId === groupId) {
      return;
    }
    this.saveGroupAssignment.emit(groupId);
  }

  assignmentWarning(group: IdbUtilityMeterGroup): string | undefined {
    const currentGroup = this.currentGroup();
    if (!currentGroup || currentGroup.guid === group.guid) {
      return undefined;
    }
    return `Moves from ${currentGroup.name}`;
  }

  submit(): void {
    if (!this.form.valid || !this.canWrite) {
      this.form.markAllAsTouched();
      return;
    }
    const draft = structuredClone(this.meter);
    const updated = this.editMeterFormService.updateMeterFromForm(draft, this.form);
    this.form.markAsPristine();
    this.saveMeter.emit(updated);
  }

  private syncOptions(initial: boolean): void {
    this.fuelOptions = getFuelTypeOptions(
      this.source,
      this.form.controls.phase.value,
      [...this.workspace.customFuels()],
      this.form.controls.scope.value,
      this.form.controls.vehicleCategory.value,
      this.form.controls.vehicleType.value
    );
    if (!initial && this.fuelOptions.length && !this.fuelOptions.some(option => option.value === this.form.controls.fuel.value)) {
      this.form.controls.fuel.patchValue(this.fuelOptions[0].value);
    }
    this.startingUnitOptions = getStartingUnitOptions(
      this.source,
      this.form.controls.phase.value,
      this.form.controls.fuel.value,
      this.form.controls.scope.value
    );
  }

  private syncValidators(): void {
    this.form.controls.fuel.setValidators(this.editMeterFormService.getFuelValidation(this.source, this.form.controls.scope.value));
    this.form.controls.phase.setValidators(this.editMeterFormService.getPhaseValidation(this.source, this.form.controls.scope.value));
    this.form.controls.heatCapacity.setValidators(this.editMeterFormService.getHeatCapacitValidation(this.source, this.form.controls.startingUnit.value, this.form.controls.scope.value));
    this.form.controls.siteToSource.setValidators(this.editMeterFormService.getSiteToSourceValidation(this.source, this.form.controls.includeInEnergy.value, this.form.controls.scope.value));
    this.form.controls.waterIntakeType.setValidators(this.editMeterFormService.getWaterIntakeValidation(this.source));
    this.form.controls.waterDischargeType.setValidators(this.editMeterFormService.getWaterDischargeValidation(this.source));
    this.form.controls.globalWarmingPotentialOption.setValidators(this.editMeterFormService.getGlobalWarmingPotentialValidation(this.form.controls.scope.value));
    Object.values(this.form.controls).forEach(control => control.updateValueAndValidity({ emitEvent: false }));
  }

  private patchDefaultStartingUnit(): void {
    const current = this.form.controls.startingUnit.value;
    if (this.startingUnitOptions.some(option => option.value === current)) {
      return;
    }
    const preferred = this.startingUnitOptions.find(option => option.value === this.facility.energyUnit)
      || this.startingUnitOptions[0];
    if (preferred) {
      this.form.controls.startingUnit.patchValue(preferred.value);
    }
  }

  private patchDerivedValues(): void {
    const selectedFuel = this.fuelOptions.find(option => option.value === this.form.controls.fuel.value);
    if (this.collectionUnitIsEnergy) {
      this.form.controls.energyUnit.patchValue(this.form.controls.startingUnit.value);
    }
    if (this.displayHeatCapacity) {
      this.form.controls.heatCapacity.patchValue(getHeatingCapacity(
        this.source,
        this.form.controls.startingUnit.value,
        this.form.controls.energyUnit.value,
        selectedFuel
      ));
    }
    this.form.controls.siteToSource.patchValue(this.displaySiteToSource
      ? getSiteToSource(this.source, selectedFuel, this.form.controls.agreementType.value)
      : 1);
  }

  private applyExistingDataLocks(): void {
    if (!this.meterDataExists) {
      return;
    }
    [
      'source',
      'startingUnit',
      'phase',
      'fuel',
      'heatCapacity',
      'energyUnit',
      'scope',
      'waterIntakeType',
      'waterDischargeType',
      'vehicleCategory',
      'vehicleType',
      'vehicleCollectionType',
      'vehicleCollectionUnit',
      'vehicleFuel',
      'vehicleFuelEfficiency',
      'vehicleDistanceUnit'
    ].forEach(control => this.form.controls[control]?.disable());
  }
}

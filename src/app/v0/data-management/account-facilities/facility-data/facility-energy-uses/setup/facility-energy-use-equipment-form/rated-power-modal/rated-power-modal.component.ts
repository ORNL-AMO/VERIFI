import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MeterPhase, MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { calculateRatedPowerWithUnitConversion, convertHeatCapacityUnits } from '@domain/calculations/energy-footprint/ratedPowerCalculation';
import { getEnergyUseUnit } from '@domain/calculations/energy-footprint/energyFootprintCalculations';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions, getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';
import { ChilledWaterUnitOptions, MassUnitOptions, PowerUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '@shared/unitOptions';

@Component({
  selector: 'app-rated-power-modal',
  standalone: false,
  templateUrl: './rated-power-modal.component.html',
  styleUrl: './rated-power-modal.component.css',
})
export class RatedPowerModalComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input({ required: true }) energySource: MeterSource;
  @Input() linkedMeters: Array<IdbUtilityMeter> = [];
  @Input() initialPowerUnit: string;
  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>();
  @Output() applyRatedPower: EventEmitter<{ ratedPower: number, unit: string }> = new EventEmitter();

  readonly powerUnitOptions: Array<UnitOption> = PowerUnitOptions;
  readonly phaseOptions: Array<MeterPhase> = ['Solid', 'Liquid', 'Gas'];

  showRatedPowerModal = true;
  fuelOptions: Array<FuelTypeOption> = [];
  physicalUnitOptions: Array<UnitOption> = [];
  phase: MeterPhase = 'Gas';
  fuel = '';
  powerUnit = 'MMBtuhr';
  physicalUnit = '';
  heatCapacity: number;
  heatCapacityDisplay = '';
  ratedCapacity: number;

  private heatCapacityEnergyUnit: string;
  private heatCapacityPhysicalUnit: string;
  private referenceHeatCapacity: number;
  private referenceHeatCapacityEnergyUnit: string;
  private referenceHeatCapacityPhysicalUnit: string;

  ngOnInit() {
    this.powerUnit = PowerUnitOptions.some(option => option.value === this.initialPowerUnit) ? this.initialPowerUnit : 'MMBtuhr';
    this.setSourceDefaults();

    if (this.linkedMeters.length > 0) {
      this.loadMeterDefaults(this.linkedMeters[0]);
    }
  }

  setSourceDefaults() {
    if (this.energySource === 'Natural Gas') {
      this.setNaturalGasDefaults();
    } else if (this.energySource === 'Other Energy') {
      this.setOtherEnergyDefaults();
    } else {
      this.setPhase('Gas', false);
    }
  }

  setNaturalGasDefaults() {
    this.setPhase('Gas', false);
    this.fuel = 'Natural Gas';
    this.physicalUnit = 'SCF';
    this.setFuelHeatCapacity();
  }

  setOtherEnergyDefaults() {
    this.fuelOptions = getFuelTypeOptions('Other Energy', this.phase, [], 4, undefined, undefined);
    this.fuelOptions = this.fuelOptions.filter(option => option.value !== 'District Hot Water');
    this.fuel = this.fuelOptions[0]?.value ?? '';
    this.setOtherEnergyPhysicalUnitOptions();
    const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
    this.physicalUnit = this.getAvailablePhysicalUnit(selectedFuel?.startingUnit);
    this.setFuelHeatCapacity();
  }

  loadMeterDefaults(meter: IdbUtilityMeter) {
    const isMobileMeter = this.energySource === 'Other Fuels' && meter.scope === 2;
    if (isMobileMeter) {
      this.setPhase('Liquid', false);
      this.fuelOptions = getMobileFuelTypes(meter.vehicleCategory, meter.vehicleType, [...this.accountWorkspaceStore.customFuels()]);
      this.fuel = this.fuelOptions.some(option => option.value === meter.vehicleFuel) ? meter.vehicleFuel : '';
    } else if (this.energySource === 'Other Energy') {
      this.fuel = this.fuelOptions.some(option => option.value === meter.fuel) ? meter.fuel : '';
      this.setOtherEnergyPhysicalUnitOptions();
    } else {
      const meterPhase: MeterPhase = meter.phase ?? (this.energySource === 'Natural Gas' ? 'Gas' : this.phase);
      this.setPhase(meterPhase, false);
      this.fuel = this.energySource === 'Natural Gas' ? 'Natural Gas' : (meter.fuel ?? '');
    }

    const meterStartingUnit = this.normalizePhysicalUnit(isMobileMeter ? meter.vehicleCollectionUnit : meter.startingUnit);
    const meterUsesPhysicalUnit = this.physicalUnitOptions.some(option => option.value === meterStartingUnit);
    if (meterUsesPhysicalUnit) {
      this.physicalUnit = meterStartingUnit;
    } else {
      const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
      this.physicalUnit = this.getAvailablePhysicalUnit(selectedFuel?.startingUnit);
    }

    const linkedHeatCapacity = meter.heatCapacity;
    const hasLinkedHeatCapacity = linkedHeatCapacity !== null
      && linkedHeatCapacity !== undefined
      && Number.isFinite(Number(linkedHeatCapacity));
    const convertedHeatCapacity = hasLinkedHeatCapacity ? convertHeatCapacityUnits(Number(linkedHeatCapacity), meter.energyUnit, meterStartingUnit, meter.energyUnit, this.physicalUnit) : NaN;

    if (!Number.isFinite(convertedHeatCapacity)) {
      this.setFuelHeatCapacity();
      return;
    }

    this.setHeatCapacityForSelectedPhysicalUnit(
      Number(linkedHeatCapacity),
      meter.energyUnit,
      meterStartingUnit
    );
  }

  get energyUnit(): string {
    return getEnergyUseUnit(this.powerUnit);
  }

  get calculatedRatedPower(): number {
    return calculateRatedPowerWithUnitConversion(
      this.ratedCapacity,
      this.heatCapacity,
      this.heatCapacityEnergyUnit,
      this.normalizePhysicalUnit(this.heatCapacityPhysicalUnit),
      this.energyUnit,
      this.physicalUnit
    );
  }

  get heatCapacityUnitLabel(): string {
    return this.heatCapacityEnergyUnit && this.heatCapacityPhysicalUnit
      ? `${this.heatCapacityEnergyUnit}/${this.getUnitOptionSymbol(this.heatCapacityPhysicalUnit, this.physicalUnitOptions)}`
      : '';
  }

  get heatCapacityLabel(): string {
    if (this.energySource !== 'Other Energy') {
      return 'Heat Capacity';
    }

    const otherEnergyType = this.fuelOptions.find(option => option.value === this.fuel)?.otherEnergyType;
    if (otherEnergyType === 'Steam') {
      return 'Specific Enthalpy';
    }
    if (otherEnergyType === 'Chilled Water' || otherEnergyType === 'Compressed Air') {
      return 'Efficiency';
    }
    return 'Heat Capacity';
  }

  get ratedCapacityUnitLabel(): string {
    return this.physicalUnit
      ? `${this.getUnitOptionSymbol(this.physicalUnit, this.physicalUnitOptions)}/hr`
      : '';
  }

  changePhase(phase: MeterPhase) {
    this.setPhase(phase, true);
  }

  changeFuel(fuel: string) {
    this.fuel = fuel;
    if (this.energySource === 'Other Energy') {
      this.setOtherEnergyPhysicalUnitOptions();
      const selectedFuel = this.fuelOptions.find(option => option.value === fuel);
      this.physicalUnit = this.getAvailablePhysicalUnit(selectedFuel?.startingUnit);
    }
    this.setFuelHeatCapacity();
  }

  changePowerUnit(powerUnit: string) {
    this.powerUnit = powerUnit;
  }

  changePhysicalUnit(physicalUnit: string) {
    this.physicalUnit = physicalUnit;
    this.setHeatCapacityFromReference();
  }

  updateHeatCapacity(value: string) {
    this.heatCapacityDisplay = value;
    this.heatCapacity = value.trim() === '' ? NaN : Number(value);
    this.referenceHeatCapacity = this.heatCapacity;
    this.referenceHeatCapacityEnergyUnit = this.heatCapacityEnergyUnit;
    this.referenceHeatCapacityPhysicalUnit = this.heatCapacityPhysicalUnit;
  }

  formatHeatCapacityDisplay() {
    if (Number.isFinite(this.heatCapacity)) {
      this.heatCapacityDisplay = this.heatCapacity.toFixed(6);
    }
  }

  closeRatedPowerModal() {
    this.closeModal.emit();
  }

  save() {
    if (this.isDisabled) {
      return;
    }
    const roundedRatedPower = Number(this.calculatedRatedPower.toFixed(6));
    this.applyRatedPower.emit({ ratedPower: roundedRatedPower, unit: this.powerUnit });
  }

  get isDisabled(): boolean {
    return (this.energySource !== 'Other Energy' && !this.phase) || !this.fuel || !this.powerUnit || !this.physicalUnit
      || !Number.isFinite(this.heatCapacity) || this.heatCapacity < 0
      || !Number.isFinite(this.ratedCapacity) || this.ratedCapacity < 0
      || !Number.isFinite(this.calculatedRatedPower);
  }

  setPhase(phase: MeterPhase, resetFuel: boolean) {
    this.phase = phase;
    this.physicalUnitOptions = phase === 'Solid' ? MassUnitOptions : phase === 'Liquid' ? VolumeLiquidOptions : VolumeGasOptions;
    this.fuelOptions = getFuelTypeOptions('Other Fuels', phase, [...this.accountWorkspaceStore.customFuels()], 1, undefined, undefined);
    if (phase === 'Gas') {
      this.fuelOptions = [this.getNaturalGasOption(), ...this.fuelOptions.filter(option => option.value !== 'Natural Gas')];
    }

    if (resetFuel || !this.fuelOptions.some(option => option.value === this.fuel)) {
      this.fuel = '';
    }
    if (!this.physicalUnitOptions.some(option => option.value === this.physicalUnit)) {
      const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
      this.physicalUnit = this.getAvailablePhysicalUnit(selectedFuel?.startingUnit);
    }
    if (resetFuel) {
      this.setFuelHeatCapacity();
    }
  }

  setFuelHeatCapacity() {
    const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
    if (!selectedFuel) {
      this.setHeatCapacityReference(undefined, undefined, undefined);
      this.setHeatCapacity(undefined, undefined, undefined);
      return;
    }
    this.setHeatCapacityForSelectedPhysicalUnit(selectedFuel.heatCapacityValue, 'MMBtu', selectedFuel.startingUnit);
  }

  setHeatCapacityForSelectedPhysicalUnit(value: number, energyUnit: string, physicalUnit: string) {
    this.setHeatCapacityReference(value, energyUnit, this.normalizePhysicalUnit(physicalUnit));
    this.setHeatCapacityFromReference();
  }

  setHeatCapacityFromReference() {
    if (!Number.isFinite(this.referenceHeatCapacity)
      || !this.referenceHeatCapacityEnergyUnit
      || !this.referenceHeatCapacityPhysicalUnit) {
      this.setHeatCapacity(undefined, this.referenceHeatCapacityEnergyUnit, this.physicalUnit);
      return;
    }

    const convertedHeatCapacity = convertHeatCapacityUnits(
      this.referenceHeatCapacity,
      this.referenceHeatCapacityEnergyUnit,
      this.referenceHeatCapacityPhysicalUnit,
      this.referenceHeatCapacityEnergyUnit,
      this.physicalUnit
    );
    if (Number.isFinite(convertedHeatCapacity)) {
      this.setHeatCapacity(convertedHeatCapacity, this.referenceHeatCapacityEnergyUnit, this.physicalUnit);
    } else {
      this.setHeatCapacity(undefined, this.referenceHeatCapacityEnergyUnit, this.physicalUnit);
    }
  }

  setHeatCapacity(value: number, energyUnit: string, physicalUnit: string) {
    this.heatCapacity = value;
    this.heatCapacityEnergyUnit = energyUnit;
    this.heatCapacityPhysicalUnit = physicalUnit;
    this.heatCapacityDisplay = Number.isFinite(value) ? value.toFixed(6) : '';
  }

  getAvailablePhysicalUnit(preferredUnit?: string): string {
    const normalizedPreferredUnit = this.normalizePhysicalUnit(preferredUnit);
    if (this.physicalUnitOptions.some(option => option.value === normalizedPreferredUnit)) {
      return normalizedPreferredUnit;
    }
    if (this.phase === 'Gas' && preferredUnit === 'ft3'
      && this.physicalUnitOptions.some(option => option.value === 'SCF')) {
      return 'SCF';
    }
    if (preferredUnit === 'Therm'
      && this.physicalUnitOptions.some(option => option.value === 'Therms')) {
      return 'Therms';
    }
    return this.physicalUnitOptions[0]?.value ?? '';
  }

  normalizePhysicalUnit(unit: string): string {
    return unit === 'Therm' ? 'Therms' : unit;
  }

  setOtherEnergyPhysicalUnitOptions() {
    const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
    if (selectedFuel?.otherEnergyType === 'Steam') {
      this.physicalUnitOptions = [...MassUnitOptions];
    } else if (selectedFuel?.otherEnergyType === 'Chilled Water') {
      this.physicalUnitOptions = [...ChilledWaterUnitOptions];
    } else if (selectedFuel?.otherEnergyType === 'Compressed Air') {
      this.physicalUnitOptions = [...VolumeGasOptions];
    } else {
      this.physicalUnitOptions = [];
    }
  }

  setHeatCapacityReference(value: number, energyUnit: string, physicalUnit: string) {
    this.referenceHeatCapacity = value;
    this.referenceHeatCapacityEnergyUnit = energyUnit;
    this.referenceHeatCapacityPhysicalUnit = physicalUnit;
  }

  getNaturalGasOption(): FuelTypeOption {
    return {
      value: 'Natural Gas',
      startingUnit: 'SCF',
      heatCapacityValue: 0.001029,
      siteToSourceMultiplier: 1,
      emissionsOutputRate: 53.1148,
      CO2: 53.06,
      CH4: 1,
      N2O: 0.1
    };
  }

  getUnitOptionSymbol(unit: string, options: Array<UnitOption>): string {
    const unitOption = options.find(option => option.value === unit);
    const symbolMatch = unitOption?.display.match(/\(([^()]*)\)\s*$/);
    return symbolMatch?.[1] ?? unit ?? '';
  }
}

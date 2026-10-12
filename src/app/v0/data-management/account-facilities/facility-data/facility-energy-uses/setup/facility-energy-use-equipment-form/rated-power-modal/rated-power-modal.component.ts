import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MeterPhase, MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { calculateRatedPowerWithUnitConversion, convertHeatCapacityUnits } from '@domain/calculations/energy-footprint/ratedPowerCalculation';
import { getEnergyUseUnit } from '@domain/calculations/energy-footprint/energyFootprintCalculations';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from '@shared/fuel-options/getFuelTypeOptions';
import { MassUnitOptions, PowerUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '@shared/unitOptions';

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


  loadMeterDefaults(meter: IdbUtilityMeter) {
    const meterPhase: MeterPhase = meter.phase ?? (this.energySource === 'Natural Gas' ? 'Gas' : this.phase);
    this.setPhase(meterPhase, false);
    this.fuel = this.energySource === 'Natural Gas' ? 'Natural Gas' : (meter.fuel ?? '');

    const meterUsesPhysicalUnit = this.physicalUnitOptions.some(option => option.value === meter.startingUnit);
    if (meterUsesPhysicalUnit) {
      this.physicalUnit = meter.startingUnit;
    } else {
      const selectedFuel = this.fuelOptions.find(option => option.value === this.fuel);
      this.physicalUnit = this.getAvailablePhysicalUnit(selectedFuel?.startingUnit);
    }

    const linkedHeatCapacity = meter.heatCapacity;
    const hasLinkedHeatCapacity = linkedHeatCapacity !== null
      && linkedHeatCapacity !== undefined
      && Number.isFinite(Number(linkedHeatCapacity));
    if (!hasLinkedHeatCapacity) {
      this.setFuelHeatCapacity();
      return;
    }

    const meterHeatCapacity = Number(linkedHeatCapacity);
    const convertedHeatCapacity = convertHeatCapacityUnits(
      meterHeatCapacity,
      meter.energyUnit,
      this.normalizePhysicalUnit(meter.startingUnit),
      meter.energyUnit,
      this.physicalUnit
    );
    if (Number.isFinite(convertedHeatCapacity)) {
      this.setHeatCapacity(convertedHeatCapacity, meter.energyUnit, this.physicalUnit);
    } else {
      this.setFuelHeatCapacity();
    }
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
    this.setFuelHeatCapacity();
  }

  changePowerUnit(powerUnit: string) {
    this.powerUnit = powerUnit;
  }

  changePhysicalUnit(physicalUnit: string) {
    const previousHeatCapacityPhysicalUnit = this.heatCapacityPhysicalUnit;
    this.physicalUnit = physicalUnit;

    if (!Number.isFinite(this.heatCapacity)
      || !this.heatCapacityEnergyUnit
      || !previousHeatCapacityPhysicalUnit) {
      this.heatCapacityPhysicalUnit = physicalUnit;
      return;
    }

    const convertedHeatCapacity = convertHeatCapacityUnits(
      this.heatCapacity,
      this.heatCapacityEnergyUnit,
      this.normalizePhysicalUnit(previousHeatCapacityPhysicalUnit),
      this.heatCapacityEnergyUnit,
      physicalUnit
    );
    if (Number.isFinite(convertedHeatCapacity)) {
      this.setHeatCapacity(convertedHeatCapacity, this.heatCapacityEnergyUnit, physicalUnit);
    } else {
      this.setHeatCapacity(undefined, this.heatCapacityEnergyUnit, physicalUnit);
    }
  }

  updateHeatCapacity(value: string) {
    this.heatCapacityDisplay = value;
    this.heatCapacity = value.trim() === '' ? NaN : Number(value);
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
    return !this.phase || !this.fuel || !this.powerUnit || !this.physicalUnit
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
      this.setHeatCapacity(undefined, undefined, undefined);
      return;
    }
    this.setHeatCapacityForSelectedPhysicalUnit(selectedFuel.heatCapacityValue, 'MMBtu', selectedFuel.startingUnit);
  }

  setHeatCapacityForSelectedPhysicalUnit(value: number, energyUnit: string, physicalUnit: string) {
    const convertedHeatCapacity = convertHeatCapacityUnits(
      value,
      energyUnit,
      this.normalizePhysicalUnit(physicalUnit),
      energyUnit,
      this.physicalUnit
    );
    if (Number.isFinite(convertedHeatCapacity)) {
      this.setHeatCapacity(convertedHeatCapacity, energyUnit, this.physicalUnit);
    } else {
      this.setHeatCapacity(value, energyUnit, physicalUnit);
    }
  }

  setHeatCapacity(value: number, energyUnit: string, physicalUnit: string) {
    this.heatCapacity = value;
    this.heatCapacityEnergyUnit = energyUnit;
    this.heatCapacityPhysicalUnit = physicalUnit;
    this.heatCapacityDisplay = Number.isFinite(value) ? value.toFixed(6) : '';
  }

  private getAvailablePhysicalUnit(preferredUnit?: string): string {
    if (this.physicalUnitOptions.some(option => option.value === preferredUnit)) {
      return preferredUnit;
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

  private normalizePhysicalUnit(unit: string): string {
    return unit === 'Therm' ? 'Therms' : unit;
  }

  private getNaturalGasOption(): FuelTypeOption {
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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConvertValue } from '@app/domain/calculations/conversions/convertValue';
import { PowerUnitOptions, UnitOption } from '@shared/unitOptions';

export type LoadFactorPhaseCount = 1 | 2 | 3;
export type LoadFactorCalculationMethod = 'voltageCurrent' | 'measuredPower';

@Component({
  selector: 'app-load-factor-modal',
  standalone: false,
  templateUrl: './load-factor-modal.component.html',
  styleUrl: './load-factor-modal.component.css',
})
export class LoadFactorModalComponent {
  @Input()
  year: number;

  @Output()
  saveCalculatedLoadFactor = new EventEmitter<number>();
  @Output()
  closeModal = new EventEmitter<void>();

  showCalculateLoadFactorModal: boolean = true;
  calculationMethod: LoadFactorCalculationMethod = 'voltageCurrent';
  ratedPower: number | null = null;
  voltage: number | null = null;
  current: number | null = null;
  numberOfPhases: LoadFactorPhaseCount = 3;
  measuredPower: number | null = null;
  ratedPowerUnit: string = 'hp';
  measuredPowerUnit: string = 'kW';
  readonly phaseOptions: Array<LoadFactorPhaseCount> = [1, 2, 3];
  readonly powerUnitOptions: Array<UnitOption> = PowerUnitOptions;

  get ratedPowerKilowatts(): number | null {
    if (!Number.isFinite(this.ratedPower) || !this.ratedPowerUnit) {
      return null;
    }

    const conversion = new ConvertValue(this.ratedPower, this.ratedPowerUnit, 'kW');
    if (conversion.hasError || !Number.isFinite(conversion.convertedValue)) {
      return null;
    }
    return conversion.convertedValue;
  }

  get actualPowerKilowatts(): number | null {
    if (this.calculationMethod === 'measuredPower') {
      if (!Number.isFinite(this.measuredPower) || this.measuredPower < 0) {
        return null;
      }
      const conversion = new ConvertValue(this.measuredPower, this.measuredPowerUnit, 'kW');
      if (conversion.hasError || !Number.isFinite(conversion.convertedValue)) {
        return null;
      }
      return conversion.convertedValue;
    }

    if (!Number.isFinite(this.voltage) || this.voltage < 0
      || !Number.isFinite(this.current) || this.current < 0
      || !Number.isInteger(this.numberOfPhases) || this.numberOfPhases < 1 || this.numberOfPhases > 3) {
      return null;
    }

    return this.voltage * this.current * Math.sqrt(this.numberOfPhases) / 1000;
  }

  get loadFactorPercent(): number | null {
    const actualPowerKilowatts = this.actualPowerKilowatts;
    const ratedPowerKilowatts = this.ratedPowerKilowatts;
    if (!Number.isFinite(actualPowerKilowatts) || actualPowerKilowatts < 0
      || !Number.isFinite(ratedPowerKilowatts) || ratedPowerKilowatts <= 0) {
      return null;
    }

    return actualPowerKilowatts / ratedPowerKilowatts * 100;
  }

  get appliedLoadFactor(): number | null {
    const loadFactorPercent = this.loadFactorPercent;
    if (!Number.isFinite(loadFactorPercent) || loadFactorPercent < 0) {
      return null;
    }

    return Math.round(Math.min(loadFactorPercent, 100) * 10) / 10;
  }

  get displayedActualPowerKilowatts(): number {
    return this.actualPowerKilowatts ?? 0;
  }

  get displayedRatedPowerKilowatts(): number {
    return this.ratedPowerKilowatts ?? 0;
  }

  get displayedLoadFactorPercent(): number {
    return this.loadFactorPercent ?? 0;
  }

  get showLoadFactorWarning(): boolean {
    return this.loadFactorPercent != null && (this.loadFactorPercent < 40 || this.loadFactorPercent > 100);
  }

  get isDisabled(): boolean {
    return this.appliedLoadFactor == null;
  }

  setCalculationMethod(calculationMethod: LoadFactorCalculationMethod) {
    if (calculationMethod === this.calculationMethod) {
      return;
    }

    this.calculationMethod = calculationMethod;
    this.ratedPower = null;
    this.voltage = null;
    this.current = null;
    this.numberOfPhases = 3;
    this.measuredPower = null;
  }

  closeCalculateLoadFactorModal() {
    this.closeModal.emit();
  }

  save() {
    const appliedLoadFactor = this.appliedLoadFactor;
    if (appliedLoadFactor == null) {
      return;
    }
    this.saveCalculatedLoadFactor.emit(appliedLoadFactor);
    this.closeCalculateLoadFactorModal();
  }
}

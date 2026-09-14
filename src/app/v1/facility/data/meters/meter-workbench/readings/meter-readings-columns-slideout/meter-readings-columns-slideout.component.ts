import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { checkShowEmissionsOutputRate, checkShowHeatCapacity, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { MeterSlideoutComponent } from '../../../shared/meter-slideout/meter-slideout.component';
import {
  MeterReadingColumnDraft,
  buildColumnDraft,
  cloneColumnDraft,
  isElectricityRecsMeter,
  meterReadingsTableType
} from '../meter-workbench-readings.models';

@Component({
  selector: 'app-meter-readings-columns-slideout',
  templateUrl: './meter-readings-columns-slideout.component.html',
  styleUrls: ['./meter-readings-columns-slideout.component.css'],
  standalone: true,
  imports: [CommonModule, MeterSlideoutComponent]
})
export class MeterReadingsColumnsSlideoutComponent implements OnChanges {
  @Input() account?: IdbAccount;
  @Input() facility?: IdbFacility;
  @Input({ required: true }) meter!: IdbUtilityMeter;
  @Input() saving = false;
  @Output() applied = new EventEmitter<MeterReadingColumnDraft>();
  @Output() cancelled = new EventEmitter<void>();

  readonly draft = signal<MeterReadingColumnDraft | undefined>(undefined);
  readonly dirty = signal(false);
  readonly tableType = computed(() => meterReadingsTableType(this.meter));
  readonly isRecs = computed(() => isElectricityRecsMeter(this.meter));
  readonly showEmissions = computed(() => !!this.account?.displayEmissions && checkShowEmissionsOutputRate(this.meter));
  readonly showHeatCapacity = computed(() => checkShowHeatCapacity(this.meter.source, this.meter.startingUnit, this.meter.scope));
  readonly displayVolumeInput = computed(() => getIsEnergyUnit(this.meter.startingUnit) === false);
  readonly showFuelEfficiency = computed(() => this.meter.scope === 2 && this.meter.vehicleCategory === 2);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] || changes['facility'] || changes['meter']) {
      this.resetDraft();
    }
  }

  requestClose(): void {
    if (!this.dirty() || window.confirm('Discard column changes?')) {
      this.cancelled.emit();
    }
  }

  apply(): void {
    const draft = this.draft();
    if (!draft || this.saving) {
      return;
    }
    this.applied.emit(cloneColumnDraft(draft));
  }

  showAll(): void {
    this.setAll(true);
  }

  hideAll(): void {
    this.setAll(false);
  }

  toggleElectricityFilter(section: 'general' | 'emissions', key: string, checked: boolean): void {
    this.draft.update(current => {
      if (!current?.electricityFilters) {
        return current;
      }
      const next = cloneColumnDraft(current);
      const filterSection = section === 'general'
        ? next.electricityFilters.generalInformationFilters
        : next.electricityFilters.emissionsFilters;
      filterSection[key] = checked;
      next.electricityFilters.generalInformationFilters.showSection = Object.entries(next.electricityFilters.generalInformationFilters)
        .some(([name, value]) => name !== 'showSection' && value === true);
      next.electricityFilters.emissionsFilters.showSection = Object.entries(next.electricityFilters.emissionsFilters)
        .some(([name, value]) => name !== 'showSection' && value === true);
      return next;
    });
    this.dirty.set(true);
  }

  toggleGeneralFilter(key: string, checked: boolean): void {
    this.draft.update(current => {
      if (!current?.generalFilters) {
        return current;
      }
      const next = cloneColumnDraft(current);
      next.generalFilters[key] = checked;
      return next;
    });
    this.dirty.set(true);
  }

  toggleVehicleFilter(key: string, checked: boolean): void {
    this.draft.update(current => {
      if (!current?.vehicleFilters) {
        return current;
      }
      const next = cloneColumnDraft(current);
      next.vehicleFilters[key] = checked;
      return next;
    });
    this.dirty.set(true);
  }

  toggleCharge(chargeGuid: string, key: 'displayUsageInTable' | 'displayChargeInTable', checked: boolean): void {
    this.draft.update(current => {
      if (!current?.charges) {
        return current;
      }
      const next = cloneColumnDraft(current);
      next.charges = next.charges?.map(charge => charge.guid === chargeGuid ? { ...charge, [key]: checked } : charge);
      return next;
    });
    this.dirty.set(true);
  }

  canShowChargeUsage(charge: MeterCharge): boolean {
    const type = this.tableType();
    if (type === 'electricity') {
      return charge.chargeType === 'consumption' || charge.chargeType === 'demand';
    }
    if (type === 'general') {
      return charge.chargeType === 'sewer';
    }
    return false;
  }

  private resetDraft(): void {
    if (this.meter) {
      this.draft.set(buildColumnDraft(this.account, this.facility, this.meter));
      this.dirty.set(false);
    }
  }

  private setAll(checked: boolean): void {
    this.draft.update(current => {
      if (!current) {
        return current;
      }
      const next = cloneColumnDraft(current);
      if (next.electricityFilters) {
        Object.keys(next.electricityFilters.generalInformationFilters).forEach(key => next.electricityFilters.generalInformationFilters[key] = checked);
        Object.keys(next.electricityFilters.emissionsFilters).forEach(key => next.electricityFilters.emissionsFilters[key] = checked && !!this.account?.displayEmissions);
      }
      if (next.generalFilters) {
        Object.keys(next.generalFilters).forEach(key => next.generalFilters[key] = checked);
      }
      if (next.vehicleFilters) {
        Object.keys(next.vehicleFilters).forEach(key => next.vehicleFilters[key] = checked);
      }
      next.charges = next.charges?.map(charge => ({
        ...charge,
        displayUsageInTable: checked,
        displayChargeInTable: checked
      }));
      return next;
    });
    this.dirty.set(true);
  }
}

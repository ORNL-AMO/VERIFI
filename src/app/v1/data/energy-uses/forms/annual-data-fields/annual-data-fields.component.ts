import { Component, computed, input, output } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { footprintEnergyUseUnits } from '@domain/calculations/energy-footprint/energy-footprint-units';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { energyUseConsumptionAmount, energyUseYears, normalizeEnergyUseSetup } from '../../models/energy-use-setup.models';
import { AnnualConsumptionForm, EnergyUseSetupForm } from '../energy-use-setup-form.service';

@Component({ selector: 'app-energy-use-annual-data-fields', standalone: false,
  templateUrl: './annual-data-fields.component.html', styleUrls: ['./annual-data-fields.component.css'] })
export class AnnualDataFieldsComponent {
  readonly form = input.required<EnergyUseSetupForm>();
  readonly item = input<IdbFacilityEnergyUseEquipment>();
  readonly canEdit = input(false);
  readonly refreshKey = input(0);
  readonly addRequested = output<void>();
  readonly copyRequested = output<number>();
  readonly removeRequested = output<number>();
  readonly units = computed(() => footprintEnergyUseUnits);
  readonly years = computed(() => {
    this.refreshKey();
    const form = this.form(), value = normalizeEnergyUseSetup({ ...form.controls.settings.getRawValue(), conditions: form.controls.conditions.getRawValue(), consumption: form.controls.consumption.getRawValue() }), item = this.item();
    return energyUseYears(value).map(year => {
      const conditions = form.controls.conditions.controls.filter(row => row.controls.year.value === year);
      const sourceRows = form.controls.consumption.controls.flatMap((source, sourceIndex) => source.controls.entries.controls
        .filter(entry => entry.controls.year.value === year).map((entry, entryIndex) => {
          const row = entry.getRawValue(), energySource = source.controls.energySource.value;
          let amount: number | null = null;
          let error = '';
          try { amount = energyUseConsumptionAmount(value, item, energySource, row); }
          catch (failure) { error = (failure as Error).message; }
          const ambiguous = value.sources.filter(row => row.energySource === energySource).length > 1
            || source.controls.entries.controls.filter(row => row.controls.year.value === year).length > 1;
          return { entry, key: `${sourceIndex}-${entryIndex}`, source: energySource, icon: meterSourceIcon(energySource), amount, error,
            ambiguous, knownUnit: this.units().includes(row.energyUseUnit), manual: row.overrideEnergyUse,
            modeLabel: `${row.overrideEnergyUse ? 'Use calculated' : 'Use manual'} consumption for ${energySource} in ${year}` };
        }));
      const complete = conditions.length === 1 && value.sources.every(source => sourceRows.filter(row => row.source === source.energySource).length === 1);
      return { year, conditions, sources: sourceRows, hasElectricity: value.sources.some(source => source.energySource === 'Electricity'),
        ambiguous: conditions.length > 1 || sourceRows.some(row => row.ambiguous), complete,
        missingSources: value.sources.filter(source => !sourceRows.some(row => row.source === source.energySource)).map(row => row.energySource) };
    });
  });
  toggleOverride(form: AnnualConsumptionForm, amount: number | null): void {
    if (!this.canEdit()) return;
    const manual = !form.controls.overrideEnergyUse.value;
    form.patchValue({ overrideEnergyUse: manual, energyUse: manual ? amount : null });
    form.markAsDirty();
  }
}

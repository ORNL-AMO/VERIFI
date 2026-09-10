import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { MeterSettingsFormService, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-emissions-details',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-emissions-details.component.html'
})
export class MeterSettingsEmissionsDetailsComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;

  constructor(private readonly formService: MeterSettingsFormService) { }

  get selectedFuelType(): FuelTypeOption | undefined {
    return this.viewModel.selectedVehicleFuelOption ?? this.viewModel.selectedFuelTypeOption;
  }

  emissionsDisplay(valueType: 'CO2' | 'CH4' | 'N2O'): string {
    return this.selectedFuelType
      ? this.formService.getEmissionDisplay(
        this.selectedFuelType,
        this.form.controls.energyUnit.value,
        valueType,
        this.form.controls.vehicleCollectionUnit.value,
        this.form.controls.vehicleDistanceUnit.value
      )
      : '';
  }

  denominator(valueType: 'CO2' | 'CH4' | 'N2O'): string {
    if (this.form.controls.source.value !== 'Other Fuels' || !this.selectedFuelType?.isMobile) {
      return this.form.controls.energyUnit.value;
    }
    if (valueType === 'CO2' || !this.selectedFuelType.isOnRoad) {
      return this.form.controls.vehicleCollectionUnit.value;
    }
    return this.form.controls.vehicleDistanceUnit.value;
  }
}

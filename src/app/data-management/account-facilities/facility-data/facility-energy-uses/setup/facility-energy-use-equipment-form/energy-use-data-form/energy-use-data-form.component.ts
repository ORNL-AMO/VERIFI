import { Component, inject, Input, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { footprintEnergyUseUnits } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-energy-use-data-form',
  standalone: false,
  templateUrl: './energy-use-data-form.component.html',
  styleUrl: './energy-use-data-form.component.css',
})
export class EnergyUseDataFormComponent {
  @Input({ required: true })
  energyUseForms: Array<FormGroup>;
  @Input({ required: true })
  energySource: MeterSource;
  @Input({ required: true })
  utilityDataForm: FormGroup;
  @Input()
  inSetup: boolean = false;

  private facilityDbService: FacilitydbService = inject(FacilitydbService);

  private facility$: Signal<IdbFacility | null> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  get facilityEnergyUnit(): string {
    const facility = this.facility$();
    return facility ? facility.energyUnit : '';
  }

  energyUnits: Array<string> = footprintEnergyUseUnits;

  toggleOverride(energyUseForm: FormGroup) {
    energyUseForm.patchValue({
      overrideEnergyUse: !energyUseForm.controls.overrideEnergyUse.value
    });
    if (energyUseForm.controls.overrideEnergyUse.value) {
      energyUseForm.controls.energyUse.enable();
    } else {
      energyUseForm.controls.energyUse.disable();
    }
  }
}

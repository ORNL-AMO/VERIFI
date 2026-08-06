import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, input, Signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { footprintEnergyUseUnits } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-energy-use-data-form',
  standalone: false,
  templateUrl: './energy-use-data-form.component.html',
  styleUrl: './energy-use-data-form.component.css',
})
export class EnergyUseDataFormComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  energyUseForms = input.required<Array<FormGroup>>();
  energySource = input.required<MeterSource>();
  utilityDataForm = input.required<FormGroup>();
  inSetup = input(false);


  private facility$: Signal<IdbFacility | null> = this.accountWorkspaceStore.selectedFacility;
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

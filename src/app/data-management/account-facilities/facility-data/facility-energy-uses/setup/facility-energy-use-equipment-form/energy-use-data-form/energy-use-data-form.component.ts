import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';

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

  facilityUnits: string;
  facilitySub: Subscription;

  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facilityUnits = facility?.energyUnit;
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

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

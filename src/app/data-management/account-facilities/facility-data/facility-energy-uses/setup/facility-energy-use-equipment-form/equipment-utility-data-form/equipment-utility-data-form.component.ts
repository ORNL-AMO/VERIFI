import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-equipment-utility-data-form',
  standalone: false,
  templateUrl: './equipment-utility-data-form.component.html',
  styleUrl: './equipment-utility-data-form.component.css',
})
export class EquipmentUtilityDataFormComponent {
  energySource = input.required<MeterSource>();
  utilityDataForm = input.required<FormGroup>();
  equipmentDetailsForm = input.required<FormGroup>();
  @Output('emitRemoveUtilityType')
  emitRemoveUtilityType: EventEmitter<void> = new EventEmitter<void>();
  inSetup = input(false);

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

  removeUtilityType() {
    this.emitRemoveUtilityType.emit();
  }
}

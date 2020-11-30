import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  facilityId: number;
  facilityForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    accountId: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    country: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    type: new FormControl('', [Validators.required]),
    tier: new FormControl('', [Validators.required]),
    size: new FormControl('', [Validators.required]),
    units: new FormControl('', [Validators.required]),
    division: new FormControl('', [Validators.required]),
  });

  selectedFacilitySub: Subscription;
  constructor(private facilitydbService: FacilitydbService) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      if (facility != null) {
        this.facilityForm.controls.id.setValue(facility.id);
        this.facilityForm.controls.accountId.setValue(facility.accountId);
        this.facilityForm.controls.name.setValue(facility.name);
        this.facilityForm.controls.country.setValue(facility.country);
        this.facilityForm.controls.state.setValue(facility.state);
        this.facilityForm.controls.address.setValue(facility.address);
        this.facilityForm.controls.type.setValue(facility.type);
        this.facilityForm.controls.tier.setValue(facility.tier);
        this.facilityForm.controls.size.setValue(facility.size);
        this.facilityForm.controls.units.setValue(facility.units);
        this.facilityForm.controls.division.setValue(facility.division);
        // Needs image
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  onFormChange(): void {
    // Update db
    this.facilitydbService.update(this.facilityForm.value);
  }

}

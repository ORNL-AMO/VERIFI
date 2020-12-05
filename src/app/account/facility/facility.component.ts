import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../shared/loading/loading.service";

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  facilityId: number;
  showDeleteFacility: boolean = false;

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

  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService
    ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
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
    this.facilityDbService.update(this.facilityForm.value);
  }

  facilityDelete() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();

    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility...");

    // Delete all info associated with account
    this.predictorDbService.deleteAllFacilityPredictors(selectedFacility.id);
    this.utilityMeterDataDbService.deleteAllFacilityMeterData(selectedFacility.id);
    this.utilityMeterDbService.deleteAllFacilityMeters(selectedFacility.id);
    this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(selectedFacility.id);
    this.facilityDbService.deleteById(selectedFacility.id);

    // Then navigate to another facility
    this.facilityDbService.setSelectedFacility();
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);
    
  }

  editFacility() {
    this.showDeleteFacility = true;
  }

  confirmDelete() {
    this.facilityDelete();
    this.showDeleteFacility = undefined;
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

}

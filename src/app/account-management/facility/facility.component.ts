import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
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

  showDeleteFacility: boolean = false;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean;
  
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
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
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

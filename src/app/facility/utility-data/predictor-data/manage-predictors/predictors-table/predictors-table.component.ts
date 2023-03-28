import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-predictors-table',
  templateUrl: './predictors-table.component.html',
  styleUrls: ['./predictors-table.component.css']
})
export class PredictorsTableComponent {

  facilityPredictorsSub: Subscription;
  facilityPredictors: Array<PredictorData>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;

  constructor(private predictorDbService: PredictordbService, private router: Router,
    private facilitydbService: FacilitydbService) {

  }

  ngOnInit() {
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
      this.facilityPredictors = val;
    });
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  selectDelete(predictor: PredictorData) {

  }

  selectEditPredictor(predictor: PredictorData) {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/edit-predictor/' + predictor.id);
  }

  addPredictor() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/add-predictor');
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }
}

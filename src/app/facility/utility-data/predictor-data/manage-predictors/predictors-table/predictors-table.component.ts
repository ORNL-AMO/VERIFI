import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';


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
  predictorToDelete: PredictorData;

  standardPredictors: Array<PredictorData>;
  degreeDayPredictors: Array<PredictorData>;


  constructor(private predictorDbService: PredictordbService, private router: Router,
    private facilitydbService: FacilitydbService, private loadingService: LoadingService) {

  }

  ngOnInit() {
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
      this.facilityPredictors = val;
      this.standardPredictors = new Array();
      this.degreeDayPredictors = new Array();
      val.forEach(predictor => {
        if (predictor.predictorType == 'Standard' || predictor.predictorType == undefined) {
          this.standardPredictors.push(predictor);
        } else if (predictor.predictorType == 'Weather') {
          this.degreeDayPredictors.push(predictor);
        }
      })
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
    this.predictorToDelete = predictor;
  }


  async confirmDelete() {
    let deleteIndex: number = this.facilityPredictors.findIndex(facilityPredictor => { return facilityPredictor.id == this.predictorToDelete.id });
    this.facilityPredictors.splice(deleteIndex, 1);
    this.predictorToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    await this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
    this.loadingService.setLoadingStatus(false);

  }

  cancelDelete() {
    this.predictorToDelete = undefined;
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


  async viewWeatherData(predictor: PredictorData) {

  }

}

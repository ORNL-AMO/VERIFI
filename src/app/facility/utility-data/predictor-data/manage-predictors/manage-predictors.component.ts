import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-manage-predictors',
  templateUrl: './manage-predictors.component.html',
  styleUrls: ['./manage-predictors.component.css']
})
export class ManagePredictorsComponent {

  facilityPredictors: Array<PredictorData>;

  constructor(private predictorDbService: PredictordbService, private router: Router) {

  }

  ngOnInit() {
    this.facilityPredictors = this.predictorDbService.facilityPredictors.getValue();
  }

  selectDelete(predictor: PredictorData) {

  }

  selectEditPredictor(predictor: PredictorData) {

  }

  addPredictor() {

  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }
}

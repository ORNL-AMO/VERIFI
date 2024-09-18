import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrl: './predictors.component.css'
})
export class PredictorsComponent {

  predictors: Array<IdbPredictor>;

  predictorsSub: Subscription;
  constructor(
    private predictorDbService: PredictorDbService,
  ) { }

  ngOnInit() {
    this.predictorsSub = this.predictorDbService.facilityPredictors.subscribe(facilityPredictors => {
      this.predictors = facilityPredictors;
    });
  }

  ngOnDestroy() {
    this.predictorsSub.unsubscribe();
  }
}

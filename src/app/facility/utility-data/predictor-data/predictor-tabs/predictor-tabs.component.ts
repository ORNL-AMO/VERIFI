import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbServiceDeprecated } from 'src/app/indexedDB/predictors-db.service';
import { PredictorDataDeprecated } from 'src/app/models/idb';

@Component({
  selector: 'app-predictor-tabs',
  templateUrl: './predictor-tabs.component.html',
  styleUrls: ['./predictor-tabs.component.css']
})
export class PredictorTabsComponent {

  facilityPredictors: Array<PredictorDataDeprecated>;
  facilityPredictorsSub: Subscription;
  constructor(private predictorDbService: PredictordbServiceDeprecated){

  }

  ngOnInit(){
    this.facilityPredictorsSub =  this.predictorDbService.facilityPredictors.subscribe(val => {
      this.facilityPredictors = val;
    });
  }

  ngOnDestroy(){
    this.facilityPredictorsSub.unsubscribe();
  }
}

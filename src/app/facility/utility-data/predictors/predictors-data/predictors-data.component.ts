import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
    selector: 'app-predictors-data',
    templateUrl: './predictors-data.component.html',
    styleUrl: './predictors-data.component.css',
    standalone: false
})
export class PredictorsDataComponent {

  predictor: IdbPredictor;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService){

  }

  ngOnInit(){
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      this.predictor = this.predictorDbService.getByGuid(predictorId);
    });
  }
}

import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
    selector: 'app-predictors-data',
    templateUrl: './predictors-data.component.html',
    styleUrl: './predictors-data.component.css',
    standalone: false
})
export class PredictorsDataComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  predictor: IdbPredictor;
  constructor(private activatedRoute: ActivatedRoute){

  }

  ngOnInit(){
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      this.predictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
    });
  }
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-manage-predictors',
  templateUrl: './manage-predictors.component.html',
  styleUrls: ['./manage-predictors.component.css']
})
export class ManagePredictorsComponent {

  constructor(private predictorDbService: PredictordbService,
    private router: Router,
    private facilityDbService: FacilitydbService) {

  }

  ngOnInit() {
    // let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    // if (facilityPredictors.length == 0) {
    //   let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    //   this.router.navigateByUrl('/facility/' + facility.id + '/utility/predictors/manage/setup-predictors');
    // }
  }
}

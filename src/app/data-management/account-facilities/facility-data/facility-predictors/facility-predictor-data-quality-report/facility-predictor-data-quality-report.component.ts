import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-facility-predictor-data-quality-report',
  standalone: false,
  templateUrl: './facility-predictor-data-quality-report.component.html',
  styleUrl: './facility-predictor-data-quality-report.component.css'
})
export class FacilityPredictorDataQualityReportComponent {

  predictor: IdbPredictor;
  predictorData: Array<IdbPredictorData>;
  
  constructor(private activatedRoute: ActivatedRoute,
    private predictorDbService: PredictorDbService,
    private router: Router,
    private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.predictor = this.predictorDbService.getByGuid(meterId);
      if (this.predictor) {
        this.predictorData = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
      } else {
        this.goToPredictorList();
      }
    });
  }
  
  goToPredictorList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/predictors')
  }
}

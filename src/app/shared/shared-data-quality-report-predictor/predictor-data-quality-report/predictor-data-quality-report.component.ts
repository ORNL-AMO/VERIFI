import { Component, Input } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getPredictorStatistics, PredictorStatistics } from '../predictorDataQualityStatistics';
import { Router } from '@angular/router';

@Component({
  selector: 'app-predictor-data-quality-report',
  standalone: false,
  templateUrl: './predictor-data-quality-report.component.html',
  styleUrl: './predictor-data-quality-report.component.css'
})
export class PredictorDataQualityReportComponent {
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;

  stats: PredictorStatistics
  outlierCount: number;

  hasData: boolean;

  constructor(private router: Router) { }

  ngOnChanges() {
    this.hasData = this.predictorData && this.predictorData.length > 0;
    if (this.hasData) {
      const data = this.predictorData?.map(d => d.amount);
      this.stats = getPredictorStatistics(data);
      this.outlierCount = this.stats.outliers;
    }
  }

  predictorDataAdd() {
    this.router.navigateByUrl('/data-management/' + this.selectedPredictor.accountId + '/facilities/' + this.selectedPredictor.facilityId + '/predictors/' + this.selectedPredictor.guid + '/predictor-data/new-entry');

  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.selectedPredictor.accountId + '/import-data');
  }
}

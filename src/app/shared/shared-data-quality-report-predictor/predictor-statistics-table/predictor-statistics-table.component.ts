import { Component, Input } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorStatistics } from '../predictorDataQualityStatistics';

@Component({
  selector: 'app-predictor-statistics-table',
  standalone: false,

  templateUrl: './predictor-statistics-table.component.html',
  styleUrl: './predictor-statistics-table.component.css'
})
export class PredictorStatisticsTableComponent {
  @Input({ required: true })
  stats: PredictorStatistics;
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;


  isValueNaN(value: number): any {
    return isNaN(value);
  }
}

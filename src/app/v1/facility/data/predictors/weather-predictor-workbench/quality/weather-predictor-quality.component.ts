import { Component } from '@angular/core';
import { PREDICTOR_QUALITY_CONTEXT } from '../../predictor-quality-context';
import { PredictorWorkbenchQualityReportComponent } from '../../predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { WeatherPredictorQualityContextService } from './weather-predictor-quality-context.service';

@Component({
  selector: 'app-weather-predictor-quality',
  templateUrl: './weather-predictor-quality.component.html',
  styleUrls: ['./weather-predictor-quality.component.css'],
  standalone: true,
  providers: [
    WeatherPredictorQualityContextService,
    { provide: PREDICTOR_QUALITY_CONTEXT, useExisting: WeatherPredictorQualityContextService }
  ],
  imports: [PredictorWorkbenchQualityReportComponent]
})
export class WeatherPredictorQualityComponent { }

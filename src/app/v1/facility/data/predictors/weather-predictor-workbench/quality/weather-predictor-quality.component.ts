import { Component } from '@angular/core';
import { PredictorWorkbenchQualityReportComponent } from '../../predictor-workbench/quality-report/predictor-workbench-quality-report.component';

@Component({
  selector: 'app-weather-predictor-quality',
  templateUrl: './weather-predictor-quality.component.html',
  styleUrls: ['./weather-predictor-quality.component.css'],
  standalone: true,
  imports: [PredictorWorkbenchQualityReportComponent]
})
export class WeatherPredictorQualityComponent { }

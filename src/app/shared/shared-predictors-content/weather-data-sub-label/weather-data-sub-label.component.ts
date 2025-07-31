import { Component, Input } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-weather-data-sub-label',
  templateUrl: './weather-data-sub-label.component.html',
  styleUrl: './weather-data-sub-label.component.css',
  standalone: false
})
export class WeatherDataSubLabelComponent {
  @Input({required: true})
  predictor: IdbPredictor;
  
}

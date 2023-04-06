import { Component, Input } from '@angular/core';
import { WeatherStation } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-weather-station-table',
  templateUrl: './weather-station-table.component.html',
  styleUrls: ['./weather-station-table.component.css']
})
export class WeatherStationTableComponent {
  @Input()
  stations: Array<WeatherStation>;

}

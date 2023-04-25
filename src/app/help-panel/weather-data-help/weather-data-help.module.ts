import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherDataHelpComponent } from './weather-data-help.component';
import { WeatherStationsHelpComponent } from './weather-stations-help/weather-stations-help.component';
import { AnnualStationHelpComponent } from './annual-station-help/annual-station-help.component';
import { DailyStationHelpComponent } from './daily-station-help/daily-station-help.component';
import { MonthlyStationHelpComponent } from './monthly-station-help/monthly-station-help.component';



@NgModule({
  declarations: [
    WeatherDataHelpComponent,
    WeatherStationsHelpComponent,
    AnnualStationHelpComponent,
    DailyStationHelpComponent,
    MonthlyStationHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    WeatherDataHelpComponent
  ]
})
export class WeatherDataHelpModule { }

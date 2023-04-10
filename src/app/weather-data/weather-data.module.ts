import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherDataComponent } from './weather-data.component';
import { FormsModule } from '@angular/forms';
import { WeatherStationsComponent } from './weather-stations/weather-stations.component';
import { WeatherStationsTableComponent } from './weather-stations/weather-stations-table/weather-stations-table.component';
import { WeatherStationsMapComponent } from './weather-stations/weather-stations-map/weather-stations-map.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { RouterModule } from '@angular/router';
import { AnnualStationDataComponent } from './annual-station-data/annual-station-data.component';
import { AnnualStationTableComponent } from './annual-station-data/annual-station-table/annual-station-table.component';
import { AnnualStationGraphComponent } from './annual-station-data/annual-station-graph/annual-station-graph.component';
import { MonthlyStationDataComponent } from './monthly-station-data/monthly-station-data.component';
import { MonthlyStationGraphComponent } from './monthly-station-data/monthly-station-graph/monthly-station-graph.component';
import { MonthlyStationTableComponent } from './monthly-station-data/monthly-station-table/monthly-station-table.component';
import { DailyStationDataComponent } from './daily-station-data/daily-station-data.component';
import { DailyStationGraphComponent } from './daily-station-data/daily-station-graph/daily-station-graph.component';
import { DailyStationTableComponent } from './daily-station-data/daily-station-table/daily-station-table.component';



@NgModule({
  declarations: [
    WeatherDataComponent,
    WeatherStationsComponent,
    WeatherStationsTableComponent,
    WeatherStationsMapComponent,
    AnnualStationDataComponent,
    AnnualStationTableComponent,
    AnnualStationGraphComponent,
    MonthlyStationDataComponent,
    MonthlyStationGraphComponent,
    MonthlyStationTableComponent,
    DailyStationDataComponent,
    DailyStationGraphComponent,
    DailyStationTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    TableItemsDropdownModule,
    RouterModule
  ]
})
export class WeatherDataModule { }

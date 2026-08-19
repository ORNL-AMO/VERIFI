import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherDataComponent } from '@v0/weather-data/weather-data.component';
import { FormsModule } from '@angular/forms';
import { WeatherStationsComponent } from '@v0/weather-data/weather-stations/weather-stations.component';
import { WeatherStationsTableComponent } from '@v0/weather-data/weather-stations/weather-stations-table/weather-stations-table.component';
import { WeatherStationsMapComponent } from '@v0/weather-data/weather-stations/weather-stations-map/weather-stations-map.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from '@app/shared/table-items-dropdown/table-items-dropdown.module';
import { RouterModule } from '@angular/router';
import { AnnualStationDataComponent } from '@v0/weather-data/annual-station-data/annual-station-data.component';
import { AnnualStationTableComponent } from '@v0/weather-data/annual-station-data/annual-station-table/annual-station-table.component';
import { AnnualStationGraphComponent } from '@v0/weather-data/annual-station-data/annual-station-graph/annual-station-graph.component';
import { MonthlyStationDataComponent } from '@v0/weather-data/monthly-station-data/monthly-station-data.component';
import { MonthlyStationGraphComponent } from '@v0/weather-data/monthly-station-data/monthly-station-graph/monthly-station-graph.component';
import { MonthlyStationTableComponent } from '@v0/weather-data/monthly-station-data/monthly-station-table/monthly-station-table.component';
import { HelperPipesModule } from '@app/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from '@app/shared/calculating-spinner/calculating-spinner.module';
import { OrderDegreeDayDetailsPipe } from '@v0/weather-data/monthly-station-data/monthly-station-table/order-degree-day-details.pipe';



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
    OrderDegreeDayDetailsPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    TableItemsDropdownModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule
  ]
})
export class WeatherDataModule { }

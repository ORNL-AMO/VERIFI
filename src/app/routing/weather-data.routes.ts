import { Route } from "@angular/router";
import { WeatherDataComponent } from 'src/app/weather-data/weather-data.component';
import { WeatherStationsComponent } from 'src/app/weather-data/weather-stations/weather-stations.component';
import { AnnualStationDataComponent } from 'src/app/weather-data/annual-station-data/annual-station-data.component';
import { MonthlyStationDataComponent } from 'src/app/weather-data/monthly-station-data/monthly-station-data.component';

export const WeatherDataRoutes: Route = {
    path: "weather-data",
    component: WeatherDataComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'stations' },
      { path: 'stations', component: WeatherStationsComponent },
      { path: 'annual-station', component: AnnualStationDataComponent },
      { path: 'monthly-station', component: MonthlyStationDataComponent }
    ]
  }
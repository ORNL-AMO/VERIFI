import { Route } from "@angular/router";
import { WeatherDataComponent } from '@v0/weather-data/weather-data.component';
import { WeatherStationsComponent } from '@v0/weather-data/weather-stations/weather-stations.component';
import { AnnualStationDataComponent } from '@v0/weather-data/annual-station-data/annual-station-data.component';
import { MonthlyStationDataComponent } from '@v0/weather-data/monthly-station-data/monthly-station-data.component';
import { accountReadyGuard } from '@app/routing/workspace-readiness.guards';

export const WeatherDataRoutes: Route = {
    path: "weather-data",
    component: WeatherDataComponent,
    canActivate: [accountReadyGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'stations' },
      { path: 'stations', component: WeatherStationsComponent },
      { path: 'annual-station', component: AnnualStationDataComponent },
      { path: 'monthly-station', component: MonthlyStationDataComponent }
    ]
  }

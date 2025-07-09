import { Route } from "@angular/router";
import { DataEvaluationComponent } from "../data-evaluation/data-evaluation.component";
import { AccountRoutes } from "./account.routes";
import { FacilityRoutes } from "./facility.routes";
import { WeatherDataRoutes } from "./weather-data.routes";



export const DataEvaluationRoutes: Route = {
    path: 'data-evaluation',
    component: DataEvaluationComponent,
    children: [
        AccountRoutes,
        FacilityRoutes,
        WeatherDataRoutes
    ],
}
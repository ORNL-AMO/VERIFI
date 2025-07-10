import { Route } from "@angular/router";
import { DataEvaluationComponent } from "../data-evaluation/data-evaluation.component";
import { AccountRoutes } from "./account.routes";
import { FacilityRoutes } from "./facility.routes";
import { WeatherDataRoutes } from "./weather-data.routes";
import { PrivacyNoticeComponent } from "../static-content/privacy-notice/privacy-notice.component";
import { AboutComponent } from "../static-content/about/about.component";
import { AcknowledgmentsComponent } from "../static-content/acknowledgments/acknowledgments.component";
import { FeedbackComponent } from "../static-content/feedback/feedback.component";
import { HelpComponent } from "../static-content/help/help.component";



export const DataEvaluationRoutes: Route = {
    path: 'data-evaluation',
    component: DataEvaluationComponent,
    children: [
        AccountRoutes,
        FacilityRoutes,
        WeatherDataRoutes,
        { path: 'privacy', component: PrivacyNoticeComponent },
        { path: 'about', component: AboutComponent },
        { path: 'acknowledgments', component: AcknowledgmentsComponent },
        { path: 'feedback', component: FeedbackComponent },
        { path: 'help', component: HelpComponent },
    ],
}
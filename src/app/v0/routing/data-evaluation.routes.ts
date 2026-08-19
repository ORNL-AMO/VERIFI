import { Route } from "@angular/router";
import { DataEvaluationComponent } from "@v0/data-evaluation/data-evaluation.component";
import { AccountRoutes } from "@v0/routing/account.routes";
import { FacilityRoutes } from "@v0/routing/facility.routes";
import { WeatherDataRoutes } from "@v0/routing/weather-data.routes";
import { PrivacyNoticeComponent } from "@v0/static-content/privacy-notice/privacy-notice.component";
import { AboutComponent } from "@v0/static-content/about/about.component";
import { AcknowledgmentsComponent } from "@v0/static-content/acknowledgments/acknowledgments.component";
import { FeedbackComponent } from "@v0/static-content/feedback/feedback.component";
import { HelpComponent } from "@v0/static-content/help/help.component";



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
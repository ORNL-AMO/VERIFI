import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { PageNotFoundComponent } from 'src/app/core-components/page-not-found/page-not-found.component';
import { AboutComponent } from 'src/app/static-content/about/about.component';
import { AcknowledgmentsComponent } from 'src/app/static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from 'src/app/static-content/feedback/feedback.component';
import { HelpComponent } from 'src/app/static-content/help/help.component';
import { AccountRoutes } from './account.routes';
import { FacilityRoutes } from './facility.routes';
import { WeatherDataRoutes } from './weather-data.routes';
import { ManageAccountsComponent } from '../core-components/manage-accounts/manage-accounts.component';
import { HomePageComponent } from '../core-components/home-page/home-page.component';
import { DataManagementRoutes } from './data-management.routes';
import { PrivacyNoticeComponent } from '../static-content/privacy-notice/privacy-notice.component';
import { DataEvaluationRoutes } from './data-evaluation.routes';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'welcome'
  },
  { path: 'welcome', component: HomePageComponent },
  DataEvaluationRoutes,
  // AccountRoutes,
  // FacilityRoutes,
  DataManagementRoutes,
  { path: 'manage-accounts', component: ManageAccountsComponent },
  // WeatherDataRoutes,
  //wildcard/page not found needs to be last route
  { path: "**", component: PageNotFoundComponent },
];

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
  useHash: true
}

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

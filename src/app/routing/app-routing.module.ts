import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { PageNotFoundComponent } from 'src/app/core-components/page-not-found/page-not-found.component';
import { ManageAccountsComponent } from '../core-components/manage-accounts/manage-accounts.component';
import { HomePageComponent } from '../core-components/home-page/home-page.component';
import { DataManagementRoutes } from './data-management.routes';
import { DataEvaluationRoutes } from './data-evaluation.routes';
import { FeedbackComponent } from '../static-content/feedback/feedback.component';
import { PrivacyNoticeComponent } from '../static-content/privacy-notice/privacy-notice.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'welcome'
  },
  { path: 'welcome', component: HomePageComponent },
  DataEvaluationRoutes,
  DataManagementRoutes,
  { path: 'manage-accounts', component: ManageAccountsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'privacy', component: PrivacyNoticeComponent },
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

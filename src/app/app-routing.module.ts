import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccountComponent } from './account-management/account/account.component';
import { FacilityComponent } from './account-management/facility/facility.component';
import { UtilityComponent } from './utility/utility.component';
import { EnergyConsumptionComponent } from './utility/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './static-content/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './utility/energy-consumption/utility-meter-data/utility-meter-data.component';
import { MeterGroupingComponent } from './utility/meter-grouping/meter-grouping.component';
import { PredictorDataComponent } from './utility/predictor-data/predictor-data.component';
import { CalanderizationComponent } from './utility/calanderization/calanderization.component';
import { VisualizationComponent } from './utility/visualization/visualization.component';
import { FacilityOverviewComponent } from './dashboard/facility-overview/facility-overview.component';
import { AccountOverviewComponent } from './dashboard/account-overview/account-overview.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AboutComponent } from './static-content/about/about.component';
import { AcknowledgmentsComponent } from './static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './static-content/feedback/feedback.component';
import { HelpComponent } from './static-content/help/help.component';
import { UploadDataComponent } from './utility/upload-data/upload-data.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    component: DashboardComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'account-summary'
      },
      {
        path: 'account-summary',
        component: AccountOverviewComponent,
      },
      {
        path: 'facility-summary',
        component: FacilityOverviewComponent,
      }
    ]
  },
  {
    path: 'account-management',
    component: AccountComponent
  },
  {
    path: 'facility-management',
    component: FacilityComponent
  },
  {
    path: 'utility',
    component: UtilityComponent,
    children: [
      {
        path: 'energy-consumption', component: EnergyConsumptionComponent,
        children: [
          { path: '', component: EnergySourceComponent },
          { path: 'electricity', component: UtilityMeterDataComponent },
          { path: 'natural-gas', component: UtilityMeterDataComponent },
          { path: 'other-fuels', component: UtilityMeterDataComponent },
          { path: 'other-energy', component: UtilityMeterDataComponent },
          { path: 'water', component: UtilityMeterDataComponent },
          { path: 'waste-water', component: UtilityMeterDataComponent },
          { path: 'other-utility', component: UtilityMeterDataComponent },
        ],
      },
      { path: 'monthly-meter-data', component: CalanderizationComponent },
      { path: 'meter-groups', component: MeterGroupingComponent },
      { path: 'predictors', component: PredictorDataComponent },
      { path: 'visualization', component: VisualizationComponent },
      { path: 'upload-data', component: UploadDataComponent },
      { path: '', pathMatch: 'full', redirectTo: 'energy-consumption'}

    ]
  },
  { path: 'about', component: AboutComponent },
  { path: 'acknowledgments', component: AcknowledgmentsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'help', component: HelpComponent },
  { path: 'style-guide', component: StyleGuideComponent },
  { path: "**", component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { P1AnalysisSectionNavComponent } from './p1/components/section-nav/analysis-section-nav/analysis-section-nav.component';
import { P1DataSectionNavComponent } from './p1/components/section-nav/data-section-nav/data-section-nav.component';
import { P1HomeSectionNavComponent } from './p1/components/section-nav/home-section-nav/home-section-nav.component';
import { P1NavListComponent } from './p1/components/section-nav/nav-list/nav-list.component';
import { P1ReportsSectionNavComponent } from './p1/components/section-nav/reports-section-nav/reports-section-nav.component';
import { P1UtilitySectionNavComponent } from './p1/components/section-nav/utility-section-nav/utility-section-nav.component';
import { P1VisualsSectionNavComponent } from './p1/components/section-nav/visuals-section-nav/visuals-section-nav.component';
import { P1HeaderBannerComponent } from './p1/components/header-banner/header-banner.component';
import { P1PrimaryRailComponent } from './p1/components/primary-rail/primary-rail.component';
import { P1RightPanelComponent } from './p1/components/right-panel/right-panel.component';
import { P1SectionNavComponent } from './p1/components/section-nav/section-nav.component';
import { P1WelcomeScreenComponent } from './p1/components/welcome-screen/welcome-screen.component';
import { P1WorkspaceShellComponent } from './p1/components/workspace-shell/workspace-shell.component';
import { P1AccountEnergyUsesDataPageComponent } from './p1/pages/account-data-pages/account-energy-uses-data-page/account-energy-uses-data-page.component';
import { P1AccountEventsDataPageComponent } from './p1/pages/account-data-pages/account-events-data-page/account-events-data-page.component';
import { P1AccountMetersDataPageComponent } from './p1/pages/account-data-pages/account-meters-data-page/account-meters-data-page.component';
import { P1AccountPredictorsDataPageComponent } from './p1/pages/account-data-pages/account-predictors-data-page/account-predictors-data-page.component';
import { P1AccountPlaceholderPageComponent } from './p1/pages/account-placeholder-page/account-placeholder-page.component';
import { P1FacilityEnergyUsesDataPageComponent } from './p1/pages/facility-data-pages/facility-energy-uses-data-page/facility-energy-uses-data-page.component';
import { P1FacilityEventsDataPageComponent } from './p1/pages/facility-data-pages/facility-events-data-page/facility-events-data-page.component';
import { P1FacilityMeterBillEditorComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/bill-editor/bill-editor.component';
import { P1FacilityMetersDataPageComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/facility-meters-data-page.component';
import { P1FacilityMeterGroupsComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/meter-groups/meter-groups.component';
import { P1FacilityMeterIndexComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/meter-index/meter-index.component';
import { P1FacilityMeterMonthlyDataComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/meter-monthly-data/meter-monthly-data.component';
import { P1FacilityMeterReadingsComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/meter-readings/meter-readings.component';
import { P1FacilityMeterSetupComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/meter-setup/meter-setup.component';
import { P1FacilityPredictorsDataPageComponent } from './p1/pages/facility-data-pages/facility-predictors-data-page/facility-predictors-data-page.component';
import { P1FacilityPlaceholderPageComponent } from './p1/pages/facility-placeholder-page/facility-placeholder-page.component';
import { P1Component } from './p1/p1.component';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

@NgModule({
  declarations: [
    PrototypeShellComponent,
    P1Component,
    P1HeaderBannerComponent,
    P1WelcomeScreenComponent,
    P1WorkspaceShellComponent,
    P1PrimaryRailComponent,
    P1SectionNavComponent,
    P1NavListComponent,
    P1HomeSectionNavComponent,
    P1DataSectionNavComponent,
    P1VisualsSectionNavComponent,
    P1AnalysisSectionNavComponent,
    P1ReportsSectionNavComponent,
    P1UtilitySectionNavComponent,
    P1RightPanelComponent,
    P1AccountMetersDataPageComponent,
    P1AccountPredictorsDataPageComponent,
    P1AccountEnergyUsesDataPageComponent,
    P1AccountEventsDataPageComponent,
    P1AccountPlaceholderPageComponent,
    P1FacilityMetersDataPageComponent,
    P1FacilityMeterIndexComponent,
    P1FacilityMeterSetupComponent,
    P1FacilityMeterReadingsComponent,
    P1FacilityMeterMonthlyDataComponent,
    P1FacilityMeterBillEditorComponent,
    P1FacilityMeterGroupsComponent,
    P1FacilityPredictorsDataPageComponent,
    P1FacilityEnergyUsesDataPageComponent,
    P1FacilityEventsDataPageComponent,
    P1FacilityPlaceholderPageComponent
  ],
  exports: [
    PrototypeShellComponent,
    P1Component
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class UxPrototypesModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';
import { P1AnalysisSectionNavComponent } from './p1/components/section-nav/analysis-section-nav/analysis-section-nav.component';
import { P1DataSectionNavComponent } from './p1/components/section-nav/data-section-nav/data-section-nav.component';
import { P1HomeSectionNavComponent } from './p1/components/section-nav/home-section-nav/home-section-nav.component';
import { P1NavListComponent } from './p1/components/section-nav/nav-list/nav-list.component';
import { P1ReportsSectionNavComponent } from './p1/components/section-nav/reports-section-nav/reports-section-nav.component';
import { P1SettingsSectionNavComponent } from './p1/components/section-nav/settings-section-nav/settings-section-nav.component';
import { P1UtilitySectionNavComponent } from './p1/components/section-nav/utility-section-nav/utility-section-nav.component';
import { P1VisualsSectionNavComponent } from './p1/components/section-nav/visuals-section-nav/visuals-section-nav.component';
import { P1HeaderBannerComponent } from './p1/components/header-banner/header-banner.component';
import { P1PrimaryRailComponent } from './p1/components/primary-rail/primary-rail.component';
import { P1RightPanelComponent } from './p1/components/right-panel/right-panel.component';
import { P1SectionNavComponent } from './p1/components/section-nav/section-nav.component';
import { P1CreateAccountDrawerComponent } from './p1/components/welcome-screen/create-account-drawer/create-account-drawer.component';
import { P1ImportAccountBackupDrawerComponent } from './p1/components/welcome-screen/import-account-backup-drawer/import-account-backup-drawer.component';
import { P1CreateFacilityDrawerComponent } from './p1/pages/account-data-pages/account-facilities-data-page/create-facility-drawer/create-facility-drawer.component';
import { P1GettingStartedDrawerComponent } from './p1/components/workspace-shell/getting-started-drawer/getting-started-drawer.component';
import { P1WelcomeScreenComponent } from './p1/components/welcome-screen/welcome-screen.component';
import { P1WorkspaceShellComponent } from './p1/components/workspace-shell/workspace-shell.component';
import { P1AccountEnergyUsesDataPageComponent } from './p1/pages/account-data-pages/account-energy-uses-data-page/account-energy-uses-data-page.component';
import { P1AccountEventsDataPageComponent } from './p1/pages/account-data-pages/account-events-data-page/account-events-data-page.component';
import { P1AccountFacilitiesDataPageComponent } from './p1/pages/account-data-pages/account-facilities-data-page/account-facilities-data-page.component';
import { P1AccountMetersDataPageComponent } from './p1/pages/account-data-pages/account-meters-data-page/account-meters-data-page.component';
import { P1AccountPredictorsDataPageComponent } from './p1/pages/account-data-pages/account-predictors-data-page/account-predictors-data-page.component';
import { P1AccountHomeGoalProgressPageComponent } from './p1/pages/account-home-page/goal-progress/account-home-goal-progress-page.component';
import { P1AccountHomeOverviewPageComponent } from './p1/pages/account-home-page/overview/account-home-overview-page.component';
import { P1AccountHomeTodoListPageComponent } from './p1/pages/account-home-page/todo-list/account-home-todo-list-page.component';
import { P1AccountPlaceholderPageComponent } from './p1/pages/account-placeholder-page/account-placeholder-page.component';
import { P1AccountSettingsFinancialComponent } from './p1/pages/account-settings-page/financial/account-settings-financial.component';
import { P1AccountSettingsGoalsComponent } from './p1/pages/account-settings-page/goals/account-settings-goals.component';
import { P1AccountSettingsPageComponent } from './p1/pages/account-settings-page/account-settings-page.component';
import { P1AccountSettingsProfileComponent } from './p1/pages/account-settings-page/profile/account-settings-profile.component';
import { P1AccountSettingsStalenessComponent } from './p1/pages/account-settings-page/staleness/account-settings-staleness.component';
import { P1AccountSettingsUnitsComponent } from './p1/pages/account-settings-page/units/account-settings-units.component';
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
import { P1FacilityHomeGoalProgressPageComponent } from './p1/pages/facility-home-page/goal-progress/facility-home-goal-progress-page.component';
import { P1FacilityHomeOverviewPageComponent } from './p1/pages/facility-home-page/overview/facility-home-overview-page.component';
import { P1FacilityHomeTodoListPageComponent } from './p1/pages/facility-home-page/todo-list/facility-home-todo-list-page.component';
import { P1FacilityAnalysisCompareDrawerComponent } from './p1/pages/facility-analysis-page/analysis-compare-drawer/analysis-compare-drawer.component';
import { P1FacilityAnalysisDashboardListComponent } from './p1/pages/facility-analysis-page/analysis-dashboard-list/analysis-dashboard-list.component';
import { P1FacilityAnalysisDashboardPageComponent } from './p1/pages/facility-analysis-page/facility-analysis-dashboard-page.component';
import { P1FacilityAnalysisDetailSummaryComponent } from './p1/pages/facility-analysis-page/analysis-detail-summary/analysis-detail-summary.component';
import { P1FacilityAnalysisGroupSetupPanelComponent } from './p1/pages/facility-analysis-page/group-setup-panel/group-setup-panel.component';
import { P1FacilityAnalysisRegressionPanelComponent } from './p1/pages/facility-analysis-page/regression-panel/regression-panel.component';
import { P1FacilityAnalysisReferencesPanelComponent } from './p1/pages/facility-analysis-page/references-panel/references-panel.component';
import { P1FacilityAnalysisResultsPanelComponent } from './p1/pages/facility-analysis-page/results-panel/results-panel.component';
import { P1FacilityAnalysisSetupPanelComponent } from './p1/pages/facility-analysis-page/analysis-setup-panel/analysis-setup-panel.component';
import { P1FacilityAnalysisWorkbenchFooterComponent } from './p1/pages/facility-analysis-page/workbench-footer/workbench-footer.component';
import { P1FacilityAnalysisWorkbenchPageComponent } from './p1/pages/facility-analysis-page/facility-analysis-workbench-page.component';
import { P1FacilityPlaceholderPageComponent } from './p1/pages/facility-placeholder-page/facility-placeholder-page.component';
import { P1FacilitySettingsFinancialComponent } from './p1/pages/facility-settings-page/financial/facility-settings-financial.component';
import { P1FacilitySettingsGoalsComponent } from './p1/pages/facility-settings-page/goals/facility-settings-goals.component';
import { P1FacilitySettingsPageComponent } from './p1/pages/facility-settings-page/facility-settings-page.component';
import { P1FacilitySettingsProfileComponent } from './p1/pages/facility-settings-page/profile/facility-settings-profile.component';
import { P1FacilitySettingsStalenessComponent } from './p1/pages/facility-settings-page/staleness/facility-settings-staleness.component';
import { P1FacilitySettingsUnitsComponent } from './p1/pages/facility-settings-page/units/facility-settings-units.component';
import { P1Component } from './p1/p1.component';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

@NgModule({
  declarations: [
    PrototypeShellComponent,
    P1Component,
    P1HeaderBannerComponent,
    P1WelcomeScreenComponent,
    P1CreateAccountDrawerComponent,
    P1ImportAccountBackupDrawerComponent,
    P1WorkspaceShellComponent,
    P1GettingStartedDrawerComponent,
    P1PrimaryRailComponent,
    P1SectionNavComponent,
    P1NavListComponent,
    P1HomeSectionNavComponent,
    P1DataSectionNavComponent,
    P1VisualsSectionNavComponent,
    P1AnalysisSectionNavComponent,
    P1ReportsSectionNavComponent,
    P1SettingsSectionNavComponent,
    P1UtilitySectionNavComponent,
    P1RightPanelComponent,
    P1AccountHomeOverviewPageComponent,
    P1AccountHomeGoalProgressPageComponent,
    P1AccountHomeTodoListPageComponent,
    P1AccountFacilitiesDataPageComponent,
    P1CreateFacilityDrawerComponent,
    P1AccountMetersDataPageComponent,
    P1AccountPredictorsDataPageComponent,
    P1AccountEnergyUsesDataPageComponent,
    P1AccountEventsDataPageComponent,
    P1AccountPlaceholderPageComponent,
    P1AccountSettingsPageComponent,
    P1AccountSettingsProfileComponent,
    P1AccountSettingsUnitsComponent,
    P1AccountSettingsGoalsComponent,
    P1AccountSettingsFinancialComponent,
    P1AccountSettingsStalenessComponent,
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
    P1FacilityAnalysisDashboardPageComponent,
    P1FacilityAnalysisWorkbenchPageComponent,
    P1FacilityAnalysisCompareDrawerComponent,
    P1FacilityAnalysisDashboardListComponent,
    P1FacilityAnalysisDetailSummaryComponent,
    P1FacilityAnalysisSetupPanelComponent,
    P1FacilityAnalysisGroupSetupPanelComponent,
    P1FacilityAnalysisRegressionPanelComponent,
    P1FacilityAnalysisResultsPanelComponent,
    P1FacilityAnalysisReferencesPanelComponent,
    P1FacilityAnalysisWorkbenchFooterComponent,
    P1FacilityHomeOverviewPageComponent,
    P1FacilityHomeGoalProgressPageComponent,
    P1FacilityHomeTodoListPageComponent,
    P1FacilityPlaceholderPageComponent,
    P1FacilitySettingsPageComponent,
    P1FacilitySettingsProfileComponent,
    P1FacilitySettingsUnitsComponent,
    P1FacilitySettingsGoalsComponent,
    P1FacilitySettingsFinancialComponent,
    P1FacilitySettingsStalenessComponent
  ],
  exports: [
    PrototypeShellComponent,
    P1Component
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HelperPipesModule]
})
export class UxPrototypesModule { }

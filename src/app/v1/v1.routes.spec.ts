import { Component, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SingleFacilityAnalysisPairService } from '@app/v1/facility/analysis/single-facility-analysis-pair.service';
import { singleSiteAccountRedirectGuard } from './routing/canonical-route.guards';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FacilityReportsModule } from '@app/v1/facility/reports/facility-reports.module';
import { AccountReportsModule } from '@app/v1/account/reports/account-reports.module';
import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { CustomGridFactorsComponent } from '@app/v1/account/data/custom-grid-factors/custom-grid-factors.component';
import { CustomFuelsComponent } from '@app/v1/account/data/custom-fuels/custom-fuels.component';
import { CustomGwpsComponent } from '@app/v1/account/data/custom-gwps/custom-gwps.component';
import { flushPendingChangesGuard, unsavedChangesGuard } from '@app/v1/account/data/unsaved-changes.guard';
import { AccountPortfolioComponent } from '@app/v1/account/data/portfolio/account-portfolio.component';
import { AccountPortfolioEnergyUsesTabComponent } from '@app/v1/account/data/portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from '@app/v1/account/data/portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from '@app/v1/account/data/portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPredictorsTabComponent } from '@app/v1/account/data/portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { FacilityDataModule } from '@app/v1/facility/data/facility-data.module';
import { FacilityMetersComponent } from '@app/v1/facility/data/meters/facility-meters.component';
import { MeterWorkbenchBillInspectionComponent } from '@app/v1/facility/data/meters/meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { MeterWorkbenchMonthlyChartComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from '@app/v1/facility/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from '@app/v1/facility/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from '@app/v1/facility/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from '@app/v1/facility/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from '@app/v1/facility/data/meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from '@app/v1/facility/data/meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from '@app/v1/facility/data/meters/meter-group-workbench/meter-group-workbench.component';
import { MeterGroupingComponent } from '@app/v1/facility/data/meters/meter-grouping/meter-grouping.component';
import { MetersDashboardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard.component';
import { FacilityPredictorsComponent } from '@app/v1/facility/data/predictors/facility-predictors.component';
import { FacilityPredictorsWorkspaceService } from '@app/v1/facility/data/predictors/facility-predictors-workspace.service';
import { PredictorWorkbenchComponent } from '@app/v1/facility/data/predictors/predictor-workbench/predictor-workbench.component';
import { PredictorWorkbenchQualityReportComponent } from '@app/v1/facility/data/predictors/predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { PredictorWorkbenchReadingsComponent } from '@app/v1/facility/data/predictors/predictor-workbench/readings/predictor-workbench-readings.component';
import { PredictorWorkbenchSettingsComponent } from '@app/v1/facility/data/predictors/predictor-workbench/settings/predictor-workbench-settings.component';
import { PredictorsDashboardComponent } from '@app/v1/facility/data/predictors/predictors-dashboard/predictors-dashboard.component';
import { WeatherPredictorWorkbenchComponent } from '@app/v1/facility/data/predictors/weather-predictor-workbench/weather-predictor-workbench.component';
import { WeatherPredictorSetupComponent } from '@app/v1/facility/data/predictors/weather-predictor-workbench/setup/weather-predictor-setup.component';
import { WeatherPredictorReadingsComponent } from '@app/v1/facility/data/predictors/weather-predictor-workbench/readings/weather-predictor-readings.component';
import { WeatherPredictorQualityComponent } from '@app/v1/facility/data/predictors/weather-predictor-workbench/quality/weather-predictor-quality.component';
import { V1Routes } from './v1.routes';
import { ImportUploadComponent } from '@app/v1/account/imports/import-upload/import-upload.component';
import { ImportWizardComponent } from '@app/v1/account/imports/import-wizard/import-wizard.component';
import { ImportColumnsStepComponent } from '@app/v1/account/imports/import-wizard/steps/columns/import-columns-step.component';
import { ImportEquipmentStepComponent } from '@app/v1/account/imports/import-wizard/steps/equipment/import-equipment-step.component';
import { ImportFacilitiesStepComponent } from '@app/v1/account/imports/import-wizard/steps/facilities/import-facilities-step.component';
import { ImportFootprintFacilityStepComponent } from '@app/v1/account/imports/import-wizard/steps/footprint-facility/import-footprint-facility-step.component';
import { ImportMappingStepComponent } from '@app/v1/account/imports/import-wizard/steps/mapping/import-mapping-step.component';
import { ImportMeterReadingsStepComponent } from '@app/v1/account/imports/import-wizard/steps/meter-readings/import-meter-readings-step.component';
import { ImportMetersStepComponent } from '@app/v1/account/imports/import-wizard/steps/meters/import-meters-step.component';
import { ImportPredictorReadingsStepComponent } from '@app/v1/account/imports/import-wizard/steps/predictor-readings/import-predictor-readings-step.component';
import { ImportPredictorsStepComponent } from '@app/v1/account/imports/import-wizard/steps/predictors/import-predictors-step.component';
import { ImportReviewStepComponent } from '@app/v1/account/imports/import-wizard/steps/review/import-review-step.component';
import { ImportWorksheetStepComponent } from '@app/v1/account/imports/import-wizard/steps/worksheet/import-worksheet-step.component';
import { AccountAnalysisDashboardComponent } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-dashboard.component';
import { AccountAnalysisWorkbenchComponent } from '@app/v1/account/analysis/account-analysis-workbench/account-analysis-workbench.component';
import { AccountAnalysisSetupComponent } from '@app/v1/account/analysis/account-analysis-workbench/setup/account-analysis-setup.component';
import { AccountAnalysisSelectFacilityItemsComponent } from '@app/v1/account/analysis/account-analysis-workbench/select-facility-items/account-analysis-select-facility-items.component';
import { AccountAnalysisResultsShellComponent } from '@app/v1/account/analysis/account-analysis-workbench/results/shell/account-analysis-results-shell.component';
import { AccountAnalysisAnnualComponent } from '@app/v1/account/analysis/account-analysis-workbench/results/annual/account-analysis-annual.component';
import { AccountAnalysisMonthlyTableComponent } from '@app/v1/account/analysis/account-analysis-workbench/results/monthly-table/account-analysis-monthly-table.component';
import { AccountAnalysisMonthlyChartComponent } from '@app/v1/account/analysis/account-analysis-workbench/results/monthly-chart/account-analysis-monthly-chart.component';
import { AccountAnalysisFacilityDetailsComponent } from '@app/v1/account/analysis/account-analysis-workbench/results/facility-details/account-analysis-facility-details.component';
import { AccountAnalysisUsedByComponent } from '@app/v1/account/analysis/account-analysis-workbench/used-by/account-analysis-used-by.component';
import { FacilityAnalysisDashboardComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-dashboard.component';
import { FacilityAnalysisWorkbenchComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/facility-analysis-workbench.component';
import { singleFacilityAnalysisPairGuard } from '@app/v1/facility/analysis/single-facility-analysis-pair.guard';
import { FacilityAnalysisSetupComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/analysis-setup/facility-analysis-setup.component';
import { FacilityAnalysisGroupShellComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/group/shell/facility-analysis-group-shell.component';
import { GroupVisualizationComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/group/visualization/group-visualization.component';
import { FacilityAnalysisBankingComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/group/banking/facility-analysis-banking.component';
import { FacilityAnalysisResultsShellComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/results/facility/shell/facility-analysis-results-shell.component';
import { FacilityAnalysisGroupMonthlyTableComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/group/results/monthly-table/facility-analysis-group-monthly-table.component';
import { FacilityAnalysisGroupMonthlyChartComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/group/results/monthly-chart/facility-analysis-group-monthly-chart.component';
import { FacilityAnalysisMonthlyTableComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/results/facility/monthly-table/facility-analysis-monthly-table.component';
import { FacilityAnalysisMonthlyChartComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/results/facility/monthly-chart/facility-analysis-monthly-chart.component';
import { FacilityAnalysisGroupContributionsComponent } from '@app/v1/facility/analysis/facility-analysis-workbench/results/facility/group-contributions/facility-analysis-group-contributions.component';

describe('V1Routes facility data meters routes', () => {
  it.each(['account', 'facility'])('redirects legacy %s staleness links to Data Validation', scope => {
    const workspaceRoute = V1Routes[0].children?.find(route => route.path === `workspace/${scope}/:${scope}Guid`);
    const settingsRoutes = workspaceRoute?.children?.find(route => route.path === 'settings')?.children;
    expect(settingsRoutes?.find(route => route.path === 'data-validation')?.component).toBeDefined();
    expect(settingsRoutes?.find(route => route.path === 'data-validation')?.canDeactivate).toEqual([unsavedChangesGuard]);
    expect(settingsRoutes?.find(route => route.path === 'staleness')).toEqual({
      path: 'staleness', redirectTo: 'data-validation', pathMatch: 'full'
    });
  });
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AccountDataModule,
        FacilityReportsModule,
        AccountReportsModule,
        RouterModule.forRoot([]),
        FacilityDataModule
      ]
    });
  });

  it('defaults Facility Data to Meters', () => {
    const dataRoute = facilityDataRoute();
    const defaultRoute = dataRoute.children?.find(route => route.path === '');

    expect(defaultRoute).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'meters'
    });
  });

  it('routes account and facility analysis dashboards with nested workbench destinations', () => {
    const accountAnalysis = accountWorkspaceRoute().children?.find(route => route.path === 'analysis');
    const facilityAnalysis = facilityWorkspaceRoute().children?.find(route => route.path === 'analysis');

    expect(accountAnalysis?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'dashboard' }),
      expect.objectContaining({ path: 'dashboard', component: AccountAnalysisDashboardComponent }),
      expect.objectContaining({ path: 'workbench/:analysisGuid', component: AccountAnalysisWorkbenchComponent })
    ]));
    const accountWorkbench = accountAnalysis?.children?.find(route => route.path === 'workbench/:analysisGuid');
    expect(accountWorkbench?.canActivate).toEqual([flushPendingChangesGuard]);
    expect(accountWorkbench?.canDeactivate).toEqual([unsavedChangesGuard]);
    expect(accountWorkbench?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'setup' }),
      expect.objectContaining({ path: 'setup', component: AccountAnalysisSetupComponent }),
      expect.objectContaining({ path: 'select-items', component: AccountAnalysisSelectFacilityItemsComponent }),
      expect.objectContaining({ path: 'results', component: AccountAnalysisResultsShellComponent }),
      expect.objectContaining({ path: 'used-by', component: AccountAnalysisUsedByComponent }),
      expect.objectContaining({ path: '**', redirectTo: 'setup' })
    ]));
    const accountResults = accountWorkbench?.children?.find(route => route.path === 'results')?.children ?? [];
    expect(accountResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'annual' }),
      expect.objectContaining({ path: 'annual', component: AccountAnalysisAnnualComponent }),
      expect.objectContaining({ path: 'monthly-table', component: AccountAnalysisMonthlyTableComponent }),
      expect.objectContaining({ path: 'monthly-chart', component: AccountAnalysisMonthlyChartComponent }),
      expect.objectContaining({ path: 'facility-details', component: AccountAnalysisFacilityDetailsComponent }),
      expect.objectContaining({ path: '**', redirectTo: 'annual' })
    ]));
    expect(facilityAnalysis?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'dashboard' }),
      expect.objectContaining({ path: 'dashboard', component: FacilityAnalysisDashboardComponent }),
      expect.objectContaining({ path: 'workbench/:analysisGuid', component: FacilityAnalysisWorkbenchComponent })
    ]));
    expect(facilityAnalysis?.canActivateChild).toEqual([singleFacilityAnalysisPairGuard]);
    const workbench = facilityAnalysis?.children?.find(route => route.path === 'workbench/:analysisGuid');
    expect(workbench?.canDeactivate).toEqual([unsavedChangesGuard]);
    expect(workbench?.providers).toBeUndefined();
    expect(workbench?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'setup' }),
      expect.objectContaining({ path: 'setup', component: FacilityAnalysisSetupComponent }),
      expect.objectContaining({ path: 'group/:groupGuid', component: FacilityAnalysisGroupShellComponent }),
      expect.objectContaining({ path: 'facility', component: FacilityAnalysisResultsShellComponent }),
      expect.objectContaining({ path: 'used-by' })
    ]));
    expect(workbench?.children?.find(route => route.path === 'group/:groupGuid')?.providers).toBeUndefined();

    const groupChildren = workbench?.children?.find(route => route.path === 'group/:groupGuid')?.children ?? [];
    expect(groupChildren.find(route => route.path === 'visualization')).toMatchObject({
      component: GroupVisualizationComponent,
      data: { analysisScope: 'group', analysisTab: 'visualization' }
    });
    expect(groupChildren.find(route => route.path === 'banking')).toMatchObject({
      component: FacilityAnalysisBankingComponent,
      data: { analysisScope: 'group', analysisTab: 'banking' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-table')).toMatchObject({
      component: FacilityAnalysisGroupMonthlyTableComponent,
      data: { analysisScope: 'group', analysisTab: 'monthly-table' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-chart')).toMatchObject({
      component: FacilityAnalysisGroupMonthlyChartComponent,
      data: { analysisScope: 'group', analysisTab: 'monthly-chart' }
    });
    expect(groupChildren.find(route => route.path === 'monthly')).toMatchObject({ redirectTo: 'monthly-table' });

    const facilityChildren = workbench?.children?.find(route => route.path === 'facility')?.children ?? [];
    expect(facilityChildren.find(route => route.path === 'monthly-table')).toMatchObject({
      component: FacilityAnalysisMonthlyTableComponent,
      data: { analysisScope: 'facility', analysisTab: 'monthly-table' }
    });
    expect(facilityChildren.find(route => route.path === 'monthly-chart')).toMatchObject({
      component: FacilityAnalysisMonthlyChartComponent,
      data: { analysisScope: 'facility', analysisTab: 'monthly-chart' }
    });
    expect(facilityChildren.find(route => route.path === 'group-contributions')).toMatchObject({
      component: FacilityAnalysisGroupContributionsComponent,
      data: { analysisScope: 'facility', analysisTab: 'group-contributions' }
    });
    expect(facilityChildren.find(route => route.path === 'monthly')).toMatchObject({ redirectTo: 'monthly-table' });
  });

  it('routes Account Portfolio tabs as child workspaces', () => {
    const route = accountPortfolioRoute();
    const children = route.children ?? [];

    expect(route.component).toBe(AccountPortfolioComponent);
    expect(children.find(child => child.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'facilities'
    });
    expect(children.find(child => child.path === 'facilities')).toMatchObject({ component: AccountPortfolioFacilitiesTabComponent });
    expect(children.find(child => child.path === 'meters')).toMatchObject({ component: AccountPortfolioMetersTabComponent });
    expect(children.find(child => child.path === 'predictors')).toMatchObject({ component: AccountPortfolioPredictorsTabComponent });
    expect(children.find(child => child.path === 'energy-uses')).toMatchObject({ component: AccountPortfolioEnergyUsesTabComponent });
    expect(children.some(child => child.path === 'analyses' || child.path === 'reports')).toBe(false);
    expect(children.find(child => child.path === '**')).toMatchObject({
      path: '**',
      redirectTo: 'facilities'
    });
  });

  it('routes the protected account import queue and file wizard', () => {
    const route = accountImportsRoute();
    const children = route.children ?? [];
    expect(children.find(child => child.path === '')).toMatchObject({ redirectTo: 'upload' });
    expect(children.find(child => child.path === 'upload')).toMatchObject({
      component: ImportUploadComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    const wizardRoute = children.find(child => child.path === 'file/:fileId');
    expect(wizardRoute).toMatchObject({
      component: ImportWizardComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    const steps = wizardRoute?.children ?? [];
    expect(steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'facilities', component: ImportFacilitiesStepComponent, data: { importStep: 'facilities' } }),
      expect.objectContaining({ path: 'worksheet', component: ImportWorksheetStepComponent, data: { importStep: 'worksheet' } }),
      expect.objectContaining({ path: 'columns', component: ImportColumnsStepComponent, data: { importStep: 'columns' } }),
      expect.objectContaining({ path: 'map-meters', component: ImportMappingStepComponent, data: { importStep: 'map-meters', mappingType: 'meter' } }),
      expect.objectContaining({ path: 'meters', component: ImportMetersStepComponent, data: { importStep: 'meters' } }),
      expect.objectContaining({ path: 'meter-readings', component: ImportMeterReadingsStepComponent, data: { importStep: 'meter-readings' } }),
      expect.objectContaining({ path: 'map-predictors', component: ImportMappingStepComponent, data: { importStep: 'map-predictors', mappingType: 'predictor' } }),
      expect.objectContaining({ path: 'predictors', component: ImportPredictorsStepComponent, data: { importStep: 'predictors' } }),
      expect.objectContaining({ path: 'predictor-readings', component: ImportPredictorReadingsStepComponent, data: { importStep: 'predictor-readings' } }),
      expect.objectContaining({ path: 'facility', component: ImportFootprintFacilityStepComponent, data: { importStep: 'facility' } }),
      expect.objectContaining({ path: 'equipment', component: ImportEquipmentStepComponent, data: { importStep: 'equipment' } }),
      expect.objectContaining({ path: 'review', component: ImportReviewStepComponent, data: { importStep: 'review' } })
    ]));
  });

  it('routes Custom Fuels through the v1 editor with unsaved-change protection', () => {
    const route = accountDataRoute().children?.find(child => child.path === 'custom-fuels');

    expect(route).toMatchObject({
      path: 'custom-fuels',
      component: CustomFuelsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
  });

  it('routes grid factors and global warming potentials through protected v1 editors', () => {
    const children = accountDataRoute().children ?? [];

    expect(children.find(child => child.path === 'custom-grid-factors')).toMatchObject({
      component: CustomGridFactorsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    expect(children.find(child => child.path === 'custom-gwps')).toMatchObject({
      component: CustomGwpsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
  });

  it('routes custom database editors in facility context with unsaved-change protection', () => {
    const children = facilityDataRoute().children ?? [];

    expect(children.find(child => child.path === 'custom-grid-factors')).toMatchObject({
      component: CustomGridFactorsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    expect(children.find(child => child.path === 'custom-fuels')).toMatchObject({
      component: CustomFuelsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    expect(children.find(child => child.path === 'custom-gwps')).toMatchObject({
      component: CustomGwpsComponent,
      canDeactivate: [unsavedChangesGuard]
    });
  });

  it('routes Meters to the landing page and deep-linked workbench tabs', () => {
    const metersRoute = metersRouteConfig();
    const meterRoute = meterGuidRoute();
    const tabRoutes = meterRoute.children ?? [];

    expect(metersRoute.component).toBe(FacilityMetersComponent);
    expect(metersRoute.children?.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: MetersDashboardComponent
    });
    expect(meterRoute.component).toBe(MeterWorkbenchComponent);
    expect(tabRoutes.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'settings'
    });
    expect(tabRoute('settings')).toMatchObject({ component: MeterWorkbenchSettingsComponent, data: { meterTab: 'settings' } });
    expect(tabRoute('readings')).toMatchObject({ component: MeterWorkbenchReadingsComponent, data: { meterTab: 'readings' } });
    expect(tabRoute('bill-inspection')).toMatchObject({ component: MeterWorkbenchBillInspectionComponent, data: { meterTab: 'bill-inspection' } });
    expect(tabRoute('monthly')).toMatchObject({ component: MeterWorkbenchMonthlyDataComponent, data: { meterTab: 'monthly' } });
    expect(tabRoute('monthly-chart')).toMatchObject({ component: MeterWorkbenchMonthlyChartComponent, data: { meterTab: 'monthly-chart' } });
    expect(tabRoute('yearly')).toMatchObject({ component: MeterWorkbenchYearlyDataComponent, data: { meterTab: 'yearly' } });
    expect(tabRoute('quality')).toMatchObject({ component: MeterWorkbenchQualityReportComponent, data: { meterTab: 'quality' } });
  });

  it('routes Meter Grouping as a separate Facility Data section', () => {
    const groupingRoute = facilityDataRoute().children?.find(child => child.path === 'meter-grouping');
    const groupingLandingRoute = groupingRoute?.children?.find(child => child.path === '');
    const groupRoute = groupingRoute?.children?.find(child => child.path === ':groupGuid');
    const groupChildren = groupRoute?.children ?? [];

    expect(groupingRoute).toMatchObject({
      path: 'meter-grouping',
      component: FacilityMetersComponent
    });
    expect(groupingLandingRoute).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: MeterGroupingComponent
    });
    expect(groupRoute?.component).toBe(MeterGroupWorkbenchComponent);
    expect(groupChildren.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'monthly-table'
    });
    expect(groupChildren.find(route => route.path === 'monthly-table')).toMatchObject({
      component: MeterGroupWorkbenchTableComponent,
      data: { meterGroupTab: 'monthly-table', meterGroupPeriod: 'monthly' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-chart')).toMatchObject({
      component: MeterGroupWorkbenchGraphComponent,
      data: { meterGroupTab: 'monthly-chart', meterGroupPeriod: 'monthly' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-graph')).toMatchObject({
      redirectTo: 'monthly-chart'
    });
    expect(groupChildren.find(route => route.path === 'yearly')).toMatchObject({
      component: MeterGroupWorkbenchYearlyDataComponent,
      data: { meterGroupTab: 'yearly', meterGroupPeriod: 'yearly' }
    });
    expect(groupChildren.find(route => route.path === 'yearly-table')).toMatchObject({
      redirectTo: 'yearly'
    });
    expect(groupChildren.find(route => route.path === 'yearly-graph')).toMatchObject({
      redirectTo: 'yearly'
    });
  });

  it('redirects invalid meter workbench tabs to Settings', () => {
    const wildcardRoute = meterGuidRoute().children?.find(route => route.path === '**');

    expect(wildcardRoute).toMatchObject({
      path: '**',
      redirectTo: 'settings'
    });
  });

  it('routes Predictors to the dashboard and guarded Settings workbench', () => {
    const predictorsRoute = predictorsRouteConfig();
    const predictorRoute = predictorsRoute.children?.find(child => child.path === ':predictorGuid');
    const children = predictorRoute?.children ?? [];

    expect(predictorsRoute.component).toBe(FacilityPredictorsComponent);
    expect(predictorsRoute.providers).toContain(FacilityPredictorsWorkspaceService);
    expect(predictorsRoute.children?.find(child => child.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: PredictorsDashboardComponent
    });
    expect(predictorRoute?.component).toBe(PredictorWorkbenchComponent);
    expect(children.find(child => child.path === '')).toMatchObject({ path: '', pathMatch: 'full', redirectTo: 'settings' });
    expect(children.find(child => child.path === 'settings')).toMatchObject({
      component: PredictorWorkbenchSettingsComponent,
      canDeactivate: [unsavedChangesGuard],
      data: { predictorTab: 'settings' }
    });
    expect(children.find(child => child.path === 'readings')).toMatchObject({
      component: PredictorWorkbenchReadingsComponent,
      canDeactivate: [unsavedChangesGuard],
      data: { predictorTab: 'readings' }
    });
    expect(children.find(child => child.path === 'quality')).toMatchObject({ component: PredictorWorkbenchQualityReportComponent, data: { predictorTab: 'quality' } });
    expect(children.find(child => child.path === '**')).toMatchObject({ path: '**', redirectTo: 'settings' });
  });

  it('routes weather creation and station tabs before the standard predictor route', () => {
    const predictorsRoute = predictorsRouteConfig();
    const weatherRoute = predictorsRoute.children?.find(child => child.path === 'weather');
    const creationRoute = weatherRoute?.children?.find(child => child.path === 'new');
    const stationRoute = weatherRoute?.children?.find(child => child.path === ':weatherGroupKey');
    const setupRoute = stationRoute?.children?.find(child => child.path === 'setup');
    const readingsRoute = stationRoute?.children?.find(child => child.path === 'readings');
    const qualityRoute = stationRoute?.children?.find(child => child.path === 'quality/:predictorGuid');
    const legacyQualityRoute = stationRoute?.children?.find(child => child.path === 'quality');
    const outputRoute = stationRoute?.children?.find(child => child.path === 'outputs/:predictorGuid');

    expect((predictorsRoute.children ?? []).findIndex(child => child.path === 'weather'))
      .toBeLessThan((predictorsRoute.children ?? []).findIndex(child => child.path === ':predictorGuid'));
    expect(creationRoute?.component).toBe(WeatherPredictorWorkbenchComponent);
    expect(creationRoute?.children?.find(child => child.path === '')).toMatchObject({
      component: WeatherPredictorSetupComponent,
      canDeactivate: [unsavedChangesGuard]
    });
    expect(stationRoute?.component).toBe(WeatherPredictorWorkbenchComponent);
    expect(setupRoute).toMatchObject({ component: WeatherPredictorSetupComponent, canDeactivate: [unsavedChangesGuard], data: { weatherTab: 'setup' } });
    expect(readingsRoute).toMatchObject({ component: WeatherPredictorReadingsComponent, canDeactivate: [unsavedChangesGuard], data: { weatherTab: 'readings' } });
    expect(qualityRoute).toMatchObject({ component: WeatherPredictorQualityComponent, data: { weatherTab: 'quality' } });
    expect(legacyQualityRoute).toMatchObject({ component: WeatherPredictorQualityComponent, data: { weatherTab: 'quality' } });
    expect(outputRoute?.children?.find(child => child.path === 'settings')).toMatchObject({
      redirectTo: '../../setup'
    });
    expect(outputRoute?.children?.find(child => child.path === 'readings')).toMatchObject({ redirectTo: '../../readings' });
    const legacyOutputQualityRoute = outputRoute?.children?.find(child => child.path === 'quality');
    expect(legacyOutputQualityRoute?.redirectTo).toEqual(expect.any(Function));
    expect((legacyOutputQualityRoute?.redirectTo as Function)({ params: { predictorGuid: 'weather-a' } }))
      .toBe('../../quality/weather-a');
  });
});

function accountDataRoute(): Route {
  const shellRoute = V1Routes[0];
  const accountRoute = shellRoute.children?.find(route => route.path === 'workspace/account/:accountGuid');
  const dataRoute = accountRoute?.children?.find(route => route.path === 'data');
  if (!dataRoute) {
    throw new Error('Account Data route was not found.');
  }
  return dataRoute;
}

function accountWorkspaceRoute(): Route {
  const route = V1Routes[0].children?.find(item => item.path === 'workspace/account/:accountGuid');
  if (!route) throw new Error('Account workspace route was not found.');
  return route;
}

function facilityWorkspaceRoute(): Route {
  const route = V1Routes[0].children?.find(item => item.path === 'workspace/facility/:facilityGuid');
  if (!route) throw new Error('Facility workspace route was not found.');
  return route;
}

function accountPortfolioRoute(): Route {
  const route = accountDataRoute().children?.find(child => child.path === 'portfolio');
  if (!route) {
    throw new Error('Account Portfolio route was not found.');
  }
  return route;
}

function accountImportsRoute(): Route {
  const shellRoute = V1Routes[0];
  const accountRoute = shellRoute.children?.find(route => route.path === 'workspace/account/:accountGuid');
  const importsRoute = accountRoute?.children?.find(route => route.path === 'imports');
  if (!importsRoute) throw new Error('Account Imports route was not found.');
  return importsRoute;
}

function facilityDataRoute(): Route {
  const shellRoute = V1Routes[0];
  const facilityRoute = shellRoute.children?.find(route => route.path === 'workspace/facility/:facilityGuid');
  const dataRoute = facilityRoute?.children?.find(route => route.path === 'data');
  if (!dataRoute) {
    throw new Error('Facility Data route was not found.');
  }
  return dataRoute;
}

function metersRouteConfig(): Route {
  const route = facilityDataRoute().children?.find(child => child.path === 'meters');
  if (!route) {
    throw new Error('Facility Data Meters route was not found.');
  }
  return route;
}

function meterGuidRoute(): Route {
  const route = metersRouteConfig().children?.find(child => child.path === ':meterGuid');
  if (!route) {
    throw new Error('Facility Data Meters workbench route was not found.');
  }
  return route;
}

function predictorsRouteConfig(): Route {
  const route = facilityDataRoute().children?.find(child => child.path === 'predictors');
  if (!route) throw new Error('Facility Data Predictors route was not found.');
  return route;
}

function tabRoute(path: string): Route {
  const route = meterGuidRoute().children?.find(child => child.path === path);
  if (!route) {
    throw new Error(`Meter workbench ${path} route was not found.`);
  }
  return route;
}

@Component({ selector: 'app-reports-route-test', standalone: true, template: 'Reports route' })
class ReportsRouteTestComponent { }

describe('single-facility workspace route boundaries', () => {
  it('redirects direct Data entries and child navigation from account exceptions, retaining Upload context', async () => {
    const account = signal({ guid: 'account-a', isSingleFacilityCompany: true });
    const facilities = signal([{ guid: 'facility-a', accountId: 'account-a' }]);
    const accountRoute = V1Routes[0].children!.find(route => route.path === 'workspace/account/:accountGuid')!;
    const facilityRoute = V1Routes[0].children!.find(route => route.path === 'workspace/facility/:facilityGuid')!;
    expect(accountRoute.canActivateChild).toEqual([singleSiteAccountRedirectGuard]);
    function stub(route: Route): Route {
      return { ...route, providers: [], canActivate: undefined, canActivateChild: undefined, canDeactivate: [],
        ...(route.component ? { component: ReportsRouteTestComponent } : {}),
        ...(route.children ? { children: route.children.map(stub) } : {}) };
    }
    TestBed.configureTestingModule({ providers: [
      { provide: AccountWorkspaceStore, useValue: { account, facilities, accountAnalyses: signal([]) } },
      { provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs: async () => false } },
      provideRouter([{ path: 'v1', children: [
        { ...stub(accountRoute), component: undefined, canActivateChild: accountRoute.canActivateChild },
        { ...stub(facilityRoute), component: undefined }
      ] }])
    ] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const accountBase = '/v1/workspace/account/account-a';
    const facilityBase = '/v1/workspace/facility/facility-a';
    await harness.navigateByUrl(`${accountBase}/data/portfolio/predictors`);
    expect(router.url).toBe(`${facilityBase}/data/predictors`);
    for (const exception of [
      'reports/dashboard',
      'imports/upload?facilityGuid=facility-a&returnUrl=%2Fv1%2Fworkspace%2Ffacility%2Ffacility-a%2Fdata%2Fmeters',
      'imports/file/file-a/review'
    ]) {
      await harness.navigateByUrl(`${accountBase}/${exception}`);
      expect(router.url).toBe(`${accountBase}/${exception}`);
      await harness.navigateByUrl(`${accountBase}/data/portfolio/meters`);
      expect(router.url).toBe(`${facilityBase}/data/meters`);
    }
    await harness.navigateByUrl(`${accountBase}/reports/dashboard`);
    await harness.navigateByUrl(`${accountBase}/analysis/dashboard`);
    expect(router.url).toBe(`${facilityBase}/analysis/dashboard`);
    account.set({ guid: 'account-a', isSingleFacilityCompany: false });
    await harness.navigateByUrl(`${accountBase}/data/portfolio/predictors`);
    expect(router.url).toBe(`${accountBase}/data/portfolio/predictors`);
  });
});

describe('V1 Reports route entry and canonicalization', () => {
  it('redirects former Data portfolio analysis/report bookmarks to their dedicated account sections', async () => {
    const workspace = V1Routes[0].children!.find(route => route.path === 'workspace/account/:accountGuid')!;
    const aliases = workspace.children!.filter(route => route.path === 'data/portfolio/analyses' || route.path === 'data/portfolio/reports');
    expect(aliases).toHaveLength(2);
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'account/:accountGuid', children: [
        ...aliases,
        { path: 'analysis/dashboard', component: ReportsRouteTestComponent },
        { path: 'reports/dashboard', component: ReportsRouteTestComponent }
      ] }
    ])] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    for (const [oldSection, section] of [['analyses', 'analysis'], ['reports', 'reports']]) {
      await harness.navigateByUrl(`/account/account-a/data/portfolio/${oldSection}`, ReportsRouteTestComponent);
      expect(router.url).toBe(`/account/account-a/${section}/dashboard`);
    }
  });

  function reportsChildren(scope: 'account' | 'facility'): Route[] {
    const workspace = V1Routes[0].children!.find(route => route.path === `workspace/${scope}/:${scope}Guid`)!;
    return workspace.children!.find(route => route.path === 'reports')!.children!;
  }
  function routeStubs(routes: Route[]): Route[] {
    return routes.map(route => ({ ...route,
      ...(route.component ? { component: ReportsRouteTestComponent, canDeactivate: [] } : {}),
      ...(route.children ? { children: routeStubs(route.children) } : {})
    }));
  }

  it('protects facility dashboard drafts and uses existing workspace readiness guards', () => {
    expect(reportsChildren('facility').find(route => route.path === 'dashboard')!.canDeactivate).toEqual([unsavedChangesGuard]);
    for (const scope of ['facility', 'account']) {
      const workspace = V1Routes[0].children!.find(route => route.path === `workspace/${scope}/:${scope}Guid`)!;
      expect(workspace.canActivate!.length).toBeGreaterThan(0);
    }
  });

  it('canonicalizes reports roots and unknown paths while preserving direct selected-report links', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'facility/:facilityGuid/reports', children: routeStubs(reportsChildren('facility')) },
      { path: 'account/:accountGuid/reports', children: routeStubs(reportsChildren('account')) }
    ])] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    for (const [input, canonical] of [
      ['/facility/facility-a/reports', '/facility/facility-a/reports/dashboard'],
      ['/facility/facility-a/reports/unknown', '/facility/facility-a/reports/dashboard'],
      ['/facility/facility-a/reports/workbench/report-a', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/facility/facility-a/reports/workbench/report-a/setup', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/facility/facility-a/reports/workbench/report-a/unknown', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/account/account-a/reports', '/account/account-a/reports/dashboard'],
      ['/account/account-a/reports/unknown', '/account/account-a/reports/dashboard']
    ]) {
      await harness.navigateByUrl(input, ReportsRouteTestComponent);
      expect(router.url).toBe(canonical);
    }
  });
});

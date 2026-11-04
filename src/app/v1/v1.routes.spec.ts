import { Component, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SingleFacilityAnalysisPairService } from '@app/v1/analysis/single-facility-analysis-pair.service';
import { inventoryScopeChangeGuard } from '@app/v1/shell/inventory-scope-change.guard';
import { inventoryLeaveGuard } from '@app/v1/shell/inventory-leave.guard';
import { singleSiteAccountRedirectGuard } from '@app/v1/routing/canonical-route.guards';
import { provideRouter, Router, Route, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FacilityReportsModule } from '@app/v1/reports/facility/facility-reports.module';
import { AccountReportsModule } from '@app/v1/reports/account/account-reports.module';
import { TestBed } from '@angular/core/testing';


import { DataModule } from '@app/v1/data/data.module';
import { CustomGridFactorsComponent } from '@app/v1/data/custom-database/custom-grid-factors/custom-grid-factors.component';
import { CustomFuelsComponent } from '@app/v1/data/custom-database/custom-fuels/custom-fuels.component';
import { CustomGwpsComponent } from '@app/v1/data/custom-database/custom-gwps/custom-gwps.component';
import { flushPendingChangesGuard, unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { DataInventoryComponent } from '@app/v1/data/inventory/data-inventory.component';
import { InventoryPlaceholderComponent } from '@app/v1/data/energy-uses/inventory-placeholder/inventory-placeholder.component';
import { FacilitiesInventoryComponent } from '@app/v1/data/facilities/inventory/facilities-inventory.component';
import { MetersInventoryComponent } from '@app/v1/data/meters/inventory/meters-inventory.component';
import { PredictorsInventoryComponent } from '@app/v1/data/predictors/inventory/predictors-inventory.component';
import { MetersModule } from '@app/v1/data/meters/meters.module';
import { MeterWorkspaceComponent } from '@app/v1/data/meters/meter-workspace/meter-workspace.component';
import { MeterWorkbenchBillInspectionComponent } from '@app/v1/data/meters/meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { MeterWorkbenchMonthlyChartComponent } from '@app/v1/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from '@app/v1/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from '@app/v1/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from '@app/v1/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from '@app/v1/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from '@app/v1/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from '@app/v1/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from '@app/v1/data/meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from '@app/v1/data/meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from '@app/v1/data/meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from '@app/v1/data/meters/meter-group-workbench/meter-group-workbench.component';
import { MeterGroupingComponent } from '@app/v1/data/meters/meter-grouping/meter-grouping.component';
import { FacilityPredictorsWorkspaceService } from '@app/v1/data/predictors/facility-predictors-workspace.service';
import { PredictorWorkbenchComponent } from '@app/v1/data/predictors/predictor-workbench/predictor-workbench.component';
import { PredictorWorkbenchQualityReportComponent } from '@app/v1/data/predictors/predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { PredictorWorkbenchReadingsComponent } from '@app/v1/data/predictors/predictor-workbench/readings/predictor-workbench-readings.component';
import { PredictorWorkbenchSettingsComponent } from '@app/v1/data/predictors/predictor-workbench/settings/predictor-workbench-settings.component';
import { WeatherPredictorWorkbenchComponent } from '@app/v1/data/predictors/weather-predictor-workbench/weather-predictor-workbench.component';
import { WeatherPredictorSetupComponent } from '@app/v1/data/predictors/weather-predictor-workbench/setup/weather-predictor-setup.component';
import { WeatherPredictorReadingsComponent } from '@app/v1/data/predictors/weather-predictor-workbench/readings/weather-predictor-readings.component';
import { WeatherPredictorQualityComponent } from '@app/v1/data/predictors/weather-predictor-workbench/quality/weather-predictor-quality.component';
import { V1Routes } from '@app/v1/v1.routes';
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
import { AnalysisInventoryComponent } from '@app/v1/analysis/inventory/analysis-inventory.component';
import { AccountAnalysisWorkbenchComponent } from '@app/v1/analysis/account/workbench/account-analysis-workbench.component';
import { AccountAnalysisSetupComponent } from '@app/v1/analysis/account/workbench/setup/account-analysis-setup.component';
import { AccountAnalysisSelectFacilityItemsComponent } from '@app/v1/analysis/account/workbench/select-facility-items/account-analysis-select-facility-items.component';
import { AccountAnalysisResultsShellComponent } from '@app/v1/analysis/account/workbench/results/shell/account-analysis-results-shell.component';
import { AccountAnalysisAnnualComponent } from '@app/v1/analysis/account/workbench/results/annual/account-analysis-annual.component';
import { AccountAnalysisMonthlyTableComponent } from '@app/v1/analysis/account/workbench/results/monthly-table/account-analysis-monthly-table.component';
import { AccountAnalysisMonthlyChartComponent } from '@app/v1/analysis/account/workbench/results/monthly-chart/account-analysis-monthly-chart.component';
import { AccountAnalysisFacilityDetailsComponent } from '@app/v1/analysis/account/workbench/results/facility-details/account-analysis-facility-details.component';
import { AccountAnalysisUsedByComponent } from '@app/v1/analysis/account/workbench/used-by/account-analysis-used-by.component';
import { FacilityAnalysisWorkbenchComponent } from '@app/v1/analysis/facility/workbench/facility-analysis-workbench.component';
import { singleFacilityAnalysisPairGuard } from '@app/v1/analysis/single-facility-analysis-pair.guard';
import { FacilityAnalysisSetupComponent } from '@app/v1/analysis/facility/workbench/analysis-setup/facility-analysis-setup.component';
import { FacilityAnalysisGroupShellComponent } from '@app/v1/analysis/facility/workbench/group/shell/facility-analysis-group-shell.component';
import { GroupVisualizationComponent } from '@app/v1/analysis/facility/workbench/group/visualization/group-visualization.component';
import { FacilityAnalysisBankingComponent } from '@app/v1/analysis/facility/workbench/group/banking/facility-analysis-banking.component';
import { FacilityAnalysisResultsShellComponent } from '@app/v1/analysis/facility/workbench/results/facility/shell/facility-analysis-results-shell.component';
import { FacilityAnalysisGroupMonthlyTableComponent } from '@app/v1/analysis/facility/workbench/group/results/monthly-table/facility-analysis-group-monthly-table.component';
import { FacilityAnalysisGroupMonthlyChartComponent } from '@app/v1/analysis/facility/workbench/group/results/monthly-chart/facility-analysis-group-monthly-chart.component';
import { FacilityAnalysisMonthlyTableComponent } from '@app/v1/analysis/facility/workbench/results/facility/monthly-table/facility-analysis-monthly-table.component';
import { FacilityAnalysisMonthlyChartComponent } from '@app/v1/analysis/facility/workbench/results/facility/monthly-chart/facility-analysis-monthly-chart.component';
import { FacilityAnalysisGroupContributionsComponent } from '@app/v1/analysis/facility/workbench/results/facility/group-contributions/facility-analysis-group-contributions.component';

describe('V1Routes facility data meters routes', () => {
  it('protects every Data inventory leaf and Analysis while retaining Reports leave protection', () => {
    const data = accountPortfolioRoute().children ?? [];
    for (const resource of ['facilities', 'meters', 'predictors', 'energy-uses']) {
      expect(data.find(route => route.path === resource)).toMatchObject({
        canDeactivate: [inventoryLeaveGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'
      });
    }
    expect(accountWorkspaceRoute().children?.find(route => route.path === 'analysis')?.children?.find(route => route.path === 'dashboard'))
      .toMatchObject({ canDeactivate: [inventoryLeaveGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange' });
    expect(accountWorkspaceRoute().children?.find(route => route.path === 'reports')?.children?.find(route => route.path === 'dashboard')?.canDeactivate)
      .toEqual([unsavedChangesGuard]);
  });
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
        DataModule,
        FacilityReportsModule,
        AccountReportsModule,
        RouterModule.forRoot([]),
        MetersModule
      ]
    });
  });

  it('has no facility dashboard defaults', () => {
    expect(facilityDataToolRoute().children?.some(route => route.path === '' || route.path === 'meters' || route.path === 'predictors')).toBe(false);
    expect(facilityWorkspaceRoute().children?.find(route => route.path === 'analysis')?.children?.some(route => route.path === 'dashboard')).toBe(false);
  });

  it('routes account and facility analysis dashboards with nested workbench destinations', () => {
    const accountAnalysis = accountWorkspaceRoute().children?.find(route => route.path === 'analysis');
    const facilityAnalysis = facilityWorkspaceRoute().children?.find(route => route.path === 'analysis');

    expect(accountAnalysis?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', redirectTo: 'dashboard' }),
      expect.objectContaining({ path: 'dashboard', component: AnalysisInventoryComponent }),
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

    expect(route.component).toBe(DataInventoryComponent);
    expect(children.find(child => child.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'facilities'
    });
    expect(children.find(child => child.path === 'facilities')).toMatchObject({ component: FacilitiesInventoryComponent });
    expect(children.find(child => child.path === 'meters')).toMatchObject({ component: MetersInventoryComponent });
    expect(children.find(child => child.path === 'predictors')).toMatchObject({ component: PredictorsInventoryComponent });
    expect(children.find(child => child.path === 'energy-uses')).toMatchObject({ component: InventoryPlaceholderComponent });
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
    const children = facilityDataToolRoute().children ?? [];

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

  it('routes Meters directly to deep-linked workbench tabs', () => {
    const metersRoute = metersRouteConfig();
    const meterRoute = meterGuidRoute();
    const tabRoutes = meterRoute.children ?? [];

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
    const groupingRoute = facilityDataToolRoute().children?.find(child => child.path === 'meter-grouping');
    const groupingLandingRoute = groupingRoute?.children?.find(child => child.path === '');
    const groupRoute = groupingRoute?.children?.find(child => child.path === ':groupGuid');
    const groupChildren = groupRoute?.children ?? [];

    expect(groupingRoute).toMatchObject({
      path: 'meter-grouping',
      component: MeterWorkspaceComponent
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

  it('routes Predictors directly to the guarded Settings workbench', () => {
    const predictorsRoute = predictorsRouteConfig();
    const predictorRoute = predictorsRoute;
    const children = predictorRoute?.children ?? [];

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
    const weatherRoute = facilityDataToolRoute().children?.find(child => child.path === 'predictors/weather');
    const creationRoute = weatherRoute?.children?.find(child => child.path === 'new');
    const stationRoute = weatherRoute?.children?.find(child => child.path === ':weatherGroupKey');
    const setupRoute = stationRoute?.children?.find(child => child.path === 'setup');
    const readingsRoute = stationRoute?.children?.find(child => child.path === 'readings');
    const qualityRoute = stationRoute?.children?.find(child => child.path === 'quality/:predictorGuid');
    const legacyQualityRoute = stationRoute?.children?.find(child => child.path === 'quality');
    const outputRoute = stationRoute?.children?.find(child => child.path === 'outputs/:predictorGuid');

    expect(facilityDataToolRoute().children!.indexOf(weatherRoute!)).toBeLessThan(facilityDataToolRoute().children!.indexOf(predictorsRoute));
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

function facilityDataToolRoute(): Route {
  const shellRoute = V1Routes[0];
  const facilityRoute = shellRoute.children?.find(route => route.path === 'workspace/facility/:facilityGuid');
  const dataRoute = facilityRoute?.children?.find(route => route.path === 'data');
  if (!dataRoute) {
    throw new Error('Facility Data route was not found.');
  }
  return dataRoute;
}

function metersRouteConfig(): Route {
  const route = facilityDataToolRoute().children?.find(child => child.path === 'meters/:meterGuid');
  if (!route) {
    throw new Error('Facility Data Meters route was not found.');
  }
  return route;
}

function meterGuidRoute(): Route {
  return metersRouteConfig().children!.find(child => child.path === '')!;
}

function predictorsRouteConfig(): Route {
  const route = facilityDataToolRoute().children?.find(child => child.path === 'predictors/:predictorGuid');
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

describe('retired facility destinations', () => {
  it.each(['data', 'data/meters', 'data/predictors', 'analysis', 'analysis/dashboard', 'reports', 'reports/dashboard', 'reports/unknown'])('uses ordinary recovery for %s without rendering a blank workspace', async path => {
    function stub(route: Route): Route {
      return { ...route, providers: [], canActivate: undefined, canActivateChild: undefined, canDeactivate: [],
        ...(route.component ? { component: ReportsRouteTestComponent } : {}),
        ...(route.children ? { children: route.children.map(stub) } : {}) };
    }
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'v1', children: [
      { path: '', pathMatch: 'full', component: ReportsRouteTestComponent },
      { ...stub(facilityWorkspaceRoute()), component: undefined }
    ] }])] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/v1/workspace/facility/facility-a/${path}`, ReportsRouteTestComponent);
    expect(TestBed.inject(Router).url).toBe('/v1');
    expect(harness.routeNativeElement?.textContent).toBe('Reports route');
  });
});

describe('single-facility workspace route boundaries', () => {
  it('keeps single-site shared inventories on account routes while retaining Upload context', async () => {
    const account = signal({ guid: 'account-a', isSingleFacilityCompany: true });
    const facilities = signal([{ guid: 'facility-a', accountId: 'account-a' }]);
    const accountRoute = V1Routes[0].children!.find(route => route.path === 'workspace/account/:accountGuid')!;
    const facilityRoute = V1Routes[0].children!.find(route => route.path === 'workspace/facility/:facilityGuid')!;
    expect(accountRoute.canActivateChild).toEqual([singleSiteAccountRedirectGuard, inventoryScopeChangeGuard]);
    function stub(route: Route): Route {
      return { ...route, providers: [], canActivate: undefined, canActivateChild: undefined, canDeactivate: [],
        ...(route.component ? { component: ReportsRouteTestComponent } : {}),
        ...(route.children ? { children: route.children.map(stub) } : {}) };
    }
    TestBed.configureTestingModule({ providers: [
      { provide: AccountWorkspaceStore, useValue: { status: () => 'ready', account, facilities, accountAnalyses: signal([]) } },
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
    expect(router.url).toBe(`${accountBase}/data/portfolio/predictors`);
    for (const exception of [
      'reports/dashboard',
      'imports/upload?facilityGuid=facility-a&returnUrl=%2Fv1%2Fworkspace%2Ffacility%2Ffacility-a%2Fdata%2Fmeters',
      'imports/file/file-a/review'
    ]) {
      await harness.navigateByUrl(`${accountBase}/${exception}`);
      expect(router.url).toBe(`${accountBase}/${exception}`);
      await harness.navigateByUrl(`${accountBase}/data/portfolio/meters`);
      expect(router.url).toBe(`${accountBase}/data/portfolio/meters`);
    }
    await harness.navigateByUrl(`${accountBase}/reports/dashboard`);
    await harness.navigateByUrl(`${accountBase}/analysis/dashboard`);
    expect(router.url).toBe(`${accountBase}/analysis/dashboard`);
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
      ...(route.component ? { component: ReportsRouteTestComponent, canDeactivate: [], canActivate: [], canActivateChild: [] } : {}),
      ...(route.children ? { children: routeStubs(route.children) } : {})
    }));
  }

  it('protects facility dashboard drafts and uses existing workspace readiness guards', () => {
    expect(reportsChildren('account').find(route => route.path === 'dashboard')!.canDeactivate).toEqual([unsavedChangesGuard]);
    expect(reportsChildren('facility').some(route => route.path === 'dashboard')).toBe(false);
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
      ['/facility/facility-a/reports/workbench/report-a', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/facility/facility-a/reports/workbench/report-a/setup', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/facility/facility-a/reports/workbench/report-a/data-checks', '/facility/facility-a/reports/workbench/report-a/data-checks'],
      ['/facility/facility-a/reports/workbench/report-a/report', '/facility/facility-a/reports/workbench/report-a/report'],
      ['/facility/facility-a/reports/workbench/report-a/unknown', '/facility/facility-a/reports/workbench/report-a/setup'],
      ['/account/account-a/reports', '/account/account-a/reports/dashboard'],
      ['/account/account-a/reports/unknown', '/account/account-a/reports/dashboard'],
      ['/account/account-a/reports/workbench/report-a', '/account/account-a/reports/workbench/report-a/setup'],
      ['/account/account-a/reports/workbench/report-a/report', '/account/account-a/reports/workbench/report-a/report'],
      ['/account/account-a/reports/workbench/report-a/data-checks', '/account/account-a/reports/workbench/report-a/data-checks'],
      ['/account/account-a/reports/workbench/report-a/unknown', '/account/account-a/reports/workbench/report-a/setup']
    ]) {
      await harness.navigateByUrl(input, ReportsRouteTestComponent);
      expect(router.url).toBe(canonical);
    }
  });
});

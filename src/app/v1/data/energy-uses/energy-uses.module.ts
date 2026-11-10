import { ExportEnergyUsesComponent } from './export-energy-uses/export-energy-uses.component';
import { BalanceFactsComponent } from './energy-use-workbench/balance-facts/balance-facts.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { SaveStatusComponent } from './forms/save-status/save-status.component';
import { AnnualYearFieldsComponent } from './forms/annual-year-fields/annual-year-fields.component';
import { AddYearDrawerComponent } from './energy-use-workbench/setup-group/add-year-drawer/add-year-drawer.component';
import { SetupGroupComponent } from './energy-use-workbench/setup-group/setup-group.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { InventoryChartSheetComponent } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.component';
import { EnergyUseChartsComponent } from './inventory/charts/energy-use-charts.component';
import { ResultsGraphsComponent } from './energy-use-workbench/results/graphs/results-graphs.component';
import { FootprintTableComponent } from './energy-use-workbench/results/footprint-table/footprint-table.component';
import { SummaryTableComponent } from './energy-use-workbench/results/summary-table/summary-table.component';
import { FacilityFootprintComponent } from './energy-use-workbench/results/facility-footprint/facility-footprint.component';
import { ResultsControlsComponent } from './energy-use-workbench/results/controls/results-controls.component';
import { SourceDetailsComponent } from './energy-use-workbench/results/source-details/source-details.component';
import { EquipmentTableComponent } from './energy-use-workbench/setup-group/equipment-table/equipment-table.component';
import { LifecycleActionsComponent } from './energy-use-workbench/lifecycle-actions/lifecycle-actions.component';
import { SetupCalculatorComponent } from './forms/setup-calculator/setup-calculator.component';
import { RouterModule } from '@angular/router';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { AnnualDataFieldsComponent } from './forms/annual-data-fields/annual-data-fields.component';
import { NgModule } from '@angular/core';
import { SettingsFieldsComponent } from './forms/settings-fields/settings-fields.component';
import { UtilitiesSlideoutComponent } from './forms/utilities-slideout/utilities-slideout.component';
import { MeterGroupsSlideoutComponent } from './forms/meter-groups-slideout/meter-groups-slideout.component';
import { CreateEnergyUseDrawerComponent } from './create-energy-use-drawer/create-energy-use-drawer.component';
import { EnergyUseSettingsComponent } from './energy-use-workbench/settings/energy-use-settings.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { EnergyUsesInventoryComponent } from './inventory/energy-uses-inventory.component';
import { ReactiveFormsModule } from '@angular/forms';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { CommonModule } from '@angular/common';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';

@NgModule({
  declarations: [
    ExportEnergyUsesComponent, EnergyUsesInventoryComponent, EquipmentTableComponent, LifecycleActionsComponent, EnergyUseChartsComponent,
    ResultsGraphsComponent, FootprintTableComponent, SummaryTableComponent, FacilityFootprintComponent, ResultsControlsComponent, SourceDetailsComponent,
    EnergyUseWorkbenchComponent, SetupGroupComponent, BalanceFactsComponent,
    AnnualDataFieldsComponent, AnnualYearFieldsComponent, AddYearDrawerComponent, SetupCalculatorComponent,
    SettingsFieldsComponent, SaveStatusComponent, UtilitiesSlideoutComponent, MeterGroupsSlideoutComponent, CreateEnergyUseDrawerComponent, EnergyUseSettingsComponent,
  ],
  imports: [
    CommonModule, EChartsChartDirective, InventoryChartDockComponent, InventoryChartSheetComponent,
    WorkspaceSlideoutComponent, ConfirmationDialogComponent, EditorConflictReviewComponent,
    RouterModule,
    PageIdentityComponent,
    BrowseHeaderDirective,
    DataWorkbenchTabsComponent,
    DataWorkbenchResourceSwitcherComponent, DataWorkbenchFactsToggleComponent,
    ReactiveFormsModule,
    InventoryGridComponent,
    BrowsePositionDirective,
    IconsModule,
    DataEmptyStateModule
  ],
  exports: [
    EnergyUseChartsComponent,
    EnergyUsesInventoryComponent,
    EnergyUseWorkbenchComponent,
    AnnualDataFieldsComponent,
  ],
})
export class EnergyUsesModule {}

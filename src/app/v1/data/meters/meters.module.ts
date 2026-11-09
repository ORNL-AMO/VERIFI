import { NgModule } from '@angular/core';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { MeterWorkbenchComponent } from './meter-workbench/meter-workbench.component';
import { MeterWorkbenchSettingsComponent } from './meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchReadingsComponent } from './meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchBillInspectionComponent } from './meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { BillInspectionOverviewChartComponent } from './meter-workbench/bill-inspection/overview-chart/bill-inspection-overview-chart.component';
import { BillInspectionChargeSectionComponent } from './meter-workbench/bill-inspection/charge-section/bill-inspection-charge-section.component';
import { BillInspectionCorrelationChartComponent } from './meter-workbench/bill-inspection/correlation-chart/bill-inspection-correlation-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from './meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchMonthlyChartComponent } from './meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchYearlyDataComponent } from './meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterWorkbenchQualityReportComponent } from './meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterGroupWorkbenchComponent } from './meter-group-workbench/meter-group-workbench.component';
import { MeterGroupWorkbenchTableComponent } from './meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchGraphComponent } from './meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchYearlyDataComponent } from './meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MetersInventoryComponent } from './inventory/meters-inventory.component';
import { CreateMeterDrawerComponent } from './create-meter-drawer/create-meter-drawer.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { CommonModule } from '@angular/common';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { PaginationComponent } from '@app/v1/shared/pagination/pagination.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MeterSettingsModule } from '@app/v1/shared/meter-settings/meter-settings.module';
import { RouterModule } from '@angular/router';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { MeterFiscalYearComparisonChartComponent } from './meter-workbench/monthly-chart/fiscal-year-comparison-chart/meter-fiscal-year-comparison-chart.component';
import { MeterWorkspaceComponent } from './meter-workspace/meter-workspace.component';
import { ConfirmDeleteMeterModalComponent } from './meter-workbench/settings/confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MeterGroupingComponent } from './meter-grouping/meter-grouping.component';
import { MeterReadingBillSlideoutComponent } from './meter-workbench/readings/meter-reading-bill-slideout/meter-reading-bill-slideout.component';
import { MeterReadingsConfirmationModalComponent } from './meter-workbench/readings/meter-readings-confirmation-modal/meter-readings-confirmation-modal.component';
import { MeterReadingsColumnsSlideoutComponent } from './meter-workbench/readings/meter-readings-columns-slideout/meter-readings-columns-slideout.component';
import { MeterCalendarizationHelpSlideoutComponent } from './meter-workbench/settings/meter-calendarization-help-slideout/meter-calendarization-help-slideout.component';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { MeterReadingsStatusComponent } from './meter-workbench/readings/meter-readings-status/meter-readings-status.component';
import { MeterReadingsTableComponent } from './meter-workbench/readings/meter-readings-table/meter-readings-table.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';
import { InventoryToolsComponent } from '@app/v1/data/inventory/inventory-tools/inventory-tools.component';
import { InventoryActionsComponent } from '@app/v1/data/inventory/inventory-actions/inventory-actions.component';
import { MeterActionsService } from './meter-actions.service';

@NgModule({
  declarations: [
    MeterWorkbenchComponent,
    MeterWorkbenchSettingsComponent,
    MeterWorkbenchReadingsComponent,
    MeterWorkbenchBillInspectionComponent,
    BillInspectionOverviewChartComponent,
    BillInspectionChargeSectionComponent,
    BillInspectionCorrelationChartComponent,
    MeterWorkbenchMonthlyDataComponent,
    MeterWorkbenchMonthlyChartComponent,
    MeterWorkbenchYearlyDataComponent,
    MeterWorkbenchQualityReportComponent,
    MeterGroupWorkbenchComponent,
    MeterGroupWorkbenchTableComponent,
    MeterGroupWorkbenchGraphComponent,
    MeterGroupWorkbenchYearlyDataComponent,
    MetersInventoryComponent,
    CreateMeterDrawerComponent
  ],
  imports: [
    EditorConflictReviewComponent,
    PageIdentityComponent,
    BrowseHeaderDirective,
    BrowsePositionDirective,
    CommonModule,
    DataWorkbenchTabsComponent,
    DataWorkbenchResourceSwitcherComponent,
    DataWorkbenchFactsToggleComponent,
    IconsModule,
    PaginationComponent,
    ReactiveFormsModule,
    MeterSettingsModule,
    RouterModule,
    EChartsChartDirective,
    MeterResultsChartComponent,
    MeterFiscalYearComparisonChartComponent,
    MeterWorkspaceComponent,
    ConfirmDeleteMeterModalComponent,
    MeterGroupingComponent,
    MeterReadingBillSlideoutComponent,
    MeterReadingsConfirmationModalComponent,
    MeterReadingsColumnsSlideoutComponent,
    MeterCalendarizationHelpSlideoutComponent,
    TooltipComponent,
    MeterReadingsStatusComponent,
    MeterReadingsTableComponent,
    DataEmptyStateModule,
    InventoryGridComponent,
    WorkspaceSlideoutComponent,
    ModalFocusTrapDirective,
    InventoryToolsComponent,
    InventoryActionsComponent,
  ],
  exports: [
    MeterWorkspaceComponent,
    MeterGroupingComponent,
    MeterGroupWorkbenchComponent,
    MeterWorkbenchComponent,
    MetersInventoryComponent,
    CreateMeterDrawerComponent
  ],
  providers: [
    MeterActionsService
  ],
})
export class MetersModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataManagementComponent } from './data-management.component';
import { DataManagementSidebarComponent } from './data-management-sidebar/data-management-sidebar.component';
import { RouterModule } from '@angular/router';
import { AccountSetupComponent } from './account-setup/account-setup.component';
import { AccountFacilitiesComponent } from './account-facilities/account-facilities.component';
import { FacilityDataComponent } from './account-facilities/facility-data/facility-data.component';
import { FacilitySetupComponent } from './account-facilities/facility-data/facility-setup/facility-setup.component';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { DataManagementImportComponent } from './data-management-import/data-management-import.component';
import { UploadFilesComponent } from './data-management-import/upload-files/upload-files.component';
import { ProcessTemplateFileComponent } from './data-management-import/process-template-file/process-template-file.component';
import { ProcessTemplateFacilitiesComponent } from './data-management-import/process-template-file/process-template-facilities/process-template-facilities.component';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MeterGroupOptionsPipe } from './data-management-import/shared-process-file/process-meters/meter-group-options.pipe';
import { FacilityMetersTableComponent } from './account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FacilityMeterComponent } from './account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilitiesListComponent } from './account-facilities/facilities-list/facilities-list.component';
import { DataManagementSidebarFacilitiesListPipe } from './data-management-sidebar/data-management-sidebar-facilities-list.pipe';
import { TableItemsDropdownModule } from '../shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from '../shared/shared-meter-content/shared-meter-content.module';
import { FacilityMeterMonthlyDataComponent } from './account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component';
import { SharedPredictorsContentModule } from "../shared/shared-predictors-content/shared-predictors-content.module";
import { FacilityPredictorsTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component';
import { FacilityPredictorComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component';
import { FacilityPredictorDataTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component';
import { FacilityPredictorDataEntryComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component';
import { FacilityPredictorDataBulkUpdateComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component';
import { ProcessGeneralFileComponent } from './data-management-import/process-general-file/process-general-file.component';
import { SelectWorksheetComponent } from './data-management-import/process-general-file/select-worksheet/select-worksheet.component';
import { LabelWithTooltipModule } from '../shared/label-with-tooltip/label-with-tooltip.module';
import { IdentifyColumnsComponent } from './data-management-import/process-general-file/identify-columns/identify-columns.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MapMetersToFacilitiesComponent } from './data-management-import/process-general-file/map-meters-to-facilities/map-meters-to-facilities.component';
import { MapPredictorsToFacilitiesComponent } from './data-management-import/process-general-file/map-predictors-to-facilities/map-predictors-to-facilities.component';
import { ProcessMetersComponent } from './data-management-import/shared-process-file/process-meters/process-meters.component';
import { ProcessMeterReadingsComponent } from './data-management-import/shared-process-file/process-meter-readings/process-meter-readings.component';
import { InspectMeterDataSummaryTableComponent } from './data-management-import/shared-process-file/process-meter-readings/inspect-meter-data-summary-table/inspect-meter-data-summary-table.component';
import { MeterDataSummaryTableComponent } from './data-management-import/shared-process-file/process-meter-readings/meter-data-summary-table/meter-data-summary-table.component';
import { ProcessPredictorsComponent } from './data-management-import/shared-process-file/process-predictors/process-predictors.component';
import { ProcessPredictorReadingsComponent } from './data-management-import/shared-process-file/process-predictor-readings/process-predictor-readings.component';
import { SubmitImportDataComponent } from './data-management-import/shared-process-file/submit-import-data/submit-import-data.component';
import { DataManagementImportFooterComponent } from './data-management-import/data-management-import-footer/data-management-import-footer.component';
import { DataManagementHomeComponent } from './data-management-home/data-management-home.component';
import { CustomDatabaseModule } from '../shared/custom-database/custom-database.module';
import { AccountCustomDataComponent } from './account-custom-data/account-custom-data.component';
import { DataManagementSidePanelModule } from './data-management-side-panel/data-management-side-panel.module';
import { SidebarItemActivePipe } from './data-management-sidebar/sidebar-item-active.pipe';
import { FacilityMeterDataQualityReportComponent } from './account-facilities/facility-data/facility-meters/facility-meter-data-quality-report/facility-meter-data-quality-report.component';
import { SharedDataQualityReportMetersModule } from "src/app/shared/shared-data-quality-report-meters/shared-data-quality-report-meters.module";
import { FacilityPredictorDataQualityReportComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-quality-report/facility-predictor-data-quality-report.component';
import { SharedDataQualityReportPredictorsModule } from '../shared/shared-data-quality-report-predictor/shared-data-quality-report-predictor.module';
import { MeterChargesVisualizationComponent } from './account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-visualization.component';
import { MeterChargesTimeseriesComponent } from './account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-timeseries/meter-charges-timeseries.component';
import { MeterChargesCorrelationPlotComponent } from './account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-correlations/meter-charges-correlation-plot/meter-charges-correlation-plot.component';
import { MeterChargesCorrelationsComponent } from './account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-correlations/meter-charges-correlations.component';
import { UpdateWeatherPredictorsModalComponent } from './data-management-home/update-weather-predictors-modal/update-weather-predictors-modal.component';
import { FacilityEnergyUseGroupManagementComponent } from './account-facilities/facility-data/facility-energy-uses/facility-energy-use-group-management/facility-energy-use-group-management.component';
import { FacilityEnergyUseGroupComponent } from './account-facilities/facility-data/facility-energy-uses/facility-energy-use-group/facility-energy-use-group.component';
import { FacilityEnergyUseEquipmentComponent } from './account-facilities/facility-data/facility-energy-uses/facility-energy-use-equipment/facility-energy-use-equipment.component';
import { FacilityEnergyUsesComponent } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses.component';
import { FacilityEnergyUsesGroupSetupComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-group-setup/facility-energy-uses-group-setup.component';
import { FacilityEnergyUseEquipmentFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/facility-energy-use-equipment-form.component';
import { FacilityEnergyUsesSummaryComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary.component';
import { FacilityEnergyUsesGroupSummaryComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary.component';
import { UtilityTypeOptionsPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/utility-type-options.pipe';
import { SizeLabelPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/size-label.pipe';
import { EquipmentUnitOptionsPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/equipment-unit-options.pipe';
import { EnergyUseFormAvailableSourcesPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/energy-use-form-available-sources.pipe';
import { EnergyUseFormIncludedSourcesPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/energy-use-form-included-sources.pipe';
import { EnergyUseSourceFormGroupPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/energy-use-source-form-group.pipe';
import { OrderEquipmentEnergyUseFormsPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/order-equipment-energy-use-forms.pipe';
import { YearOptionsFilterPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/year-options-filter.pipe';
import { EquipmentUtilityDataFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/equipment-utility-data-form/equipment-utility-data-form.component';
import { AnnualOperatingConditionsFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/annual-operating-conditions-form/annual-operating-conditions-form.component';
import { EquipmentDetailsFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/equipment-details-form/equipment-details-form.component';
import { EnergyUseEquipmentInvalidPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/energy-use-equipment-invalid.pipe';
import { EnergyUseUnitPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/energy-use-unit.pipe';
import { ConvertEnergyUseResultPipe } from './account-facilities/facility-data/facility-energy-uses/facility-energy-uses-pipes/convert-energy-use-result.pipe';
import { FacilityEnergyUsesSummaryTableComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary-table/facility-energy-uses-summary-table.component';
import { OrderFacilityEnergyUsesSummaryTablePipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary-table/order-facility-energy-uses-summary-table.pipe';
import { FacilityEnergyUsesGroupSummaryTableComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary-table/facility-energy-uses-group-summary-table.component';
import { OrderFacilityEnergyUsesGroupSummaryTablePipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary-table/order-facility-energy-uses-group-summary-table.pipe';
import { ProcessFootprintToolFileComponent } from './data-management-import/process-footprint-tool-file/process-footprint-tool-file.component';
import { FootprintUploadSelectFacilityComponent } from './data-management-import/process-footprint-tool-file/footprint-upload-select-facility/footprint-upload-select-facility.component';
import { FacilityEnergyUsesSummaryChartComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary-chart/facility-energy-uses-summary-chart.component';
import { FacilityEnergyUsesGroupSummaryChartComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary-chart/facility-energy-uses-group-summary-chart.component';
import { FacilityEnergyUsesGroupFootprintComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint.component';
import { FacilityEnergyUsesFootprintComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint.component';
import { FacilityEnergyUsesGroupFootprintTableComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint-table/facility-energy-uses-group-footprint-table.component';
import { FacilityEnergyUsesGroupFootprintChartComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint-chart/facility-energy-uses-group-footprint-chart.component';
import { FacilityEnergyUsesFootprintTableComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint-table/facility-energy-uses-footprint-table.component';
import { FacilityEnergyUsesFootprintChartComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint-chart/facility-energy-uses-footprint-chart.component';
import { OrderFacilityEnergyUsesFootprintTableBySourcePipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint-table/order-facility-energy-uses-footprint-table-by-source.pipe';
import { OrderFacilityEnergyUsesFootprintTableByMeterGroupPipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint-table/order-facility-energy-uses-footprint-table-by-meter-group.pipe';
import { OrderFacilityEnergyUsesGroupFootprintTableByMeterGroupPipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint-table/order-facility-energy-uses-group-footprint-table-by-meter-group.pipe';
import { OrderFacilityEnergyUsesGroupFootprintTableBySourcePipe } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint-table/order-facility-energy-uses-group-footprint-table-by-source.pipe';
import { FacilityEnergyUsesResultDropdownComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-result-dropdown/facility-energy-uses-result-dropdown.component';
import { EnergyUseDataFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/energy-use-data-form/energy-use-data-form.component';
import { FacilityEnergyUsesSetupOptionsComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/facility-energy-uses-setup-options.component';
import { NewEquipmentGroupSetupOptionsComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/new-equipment-group-setup-options/new-equipment-group-setup-options.component';
import { EditExistingGroupsSetupOptionsComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/edit-existing-groups-setup-options/edit-existing-groups-setup-options.component';
import { AddYearSetupOptionsComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/add-year-setup-options/add-year-setup-options.component';
import { FacilityMeterGroupsComponent } from './account-facilities/facility-data/facility-meters/facility-meter-groups/facility-meter-groups.component';
import { FacilityMeterDataComponent } from './account-facilities/facility-data/facility-meters/facility-meter-data/facility-meter-data.component';
import { FacilityEnergyUsesModifyAnnualDataComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-modify-annual-data/facility-energy-uses-modify-annual-data.component';
import { EnergyUseGroupModifyAnnualDataFormComponent } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-modify-annual-data/energy-use-group-modify-annual-data-form/energy-use-group-modify-annual-data-form.component';
import { MeterGroupSourceConflictPipe } from './account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/equipment-details-form/meter-group-source-conflict.pipe';
import { MapMeterGroupsToEquipmentComponent } from './data-management-import/process-footprint-tool-file/map-meter-groups-to-equipment/map-meter-groups-to-equipment.component';
import { ConfirmEnergyUsesUploadComponent } from './data-management-import/process-footprint-tool-file/confirm-energy-uses-upload/confirm-energy-uses-upload.component';
import { FacilityEnergyUsesSankeyComponent } from './account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-sankey/facility-energy-uses-sankey.component';


@NgModule({
  declarations: [
    DataManagementComponent,
    DataManagementSidebarComponent,
    AccountSetupComponent,
    AccountFacilitiesComponent,
    FacilityDataComponent,
    FacilitySetupComponent,
    DataManagementImportComponent,
    UploadFilesComponent,
    ProcessTemplateFileComponent,
    ProcessTemplateFacilitiesComponent,
    MeterGroupOptionsPipe,
    FacilityMetersTableComponent,
    FacilityMeterComponent,
    FacilitiesListComponent,
    DataManagementSidebarFacilitiesListPipe,
    FacilityMeterMonthlyDataComponent,
    MeterDataSummaryTableComponent,
    InspectMeterDataSummaryTableComponent,
    FacilityPredictorsTableComponent,
    FacilityPredictorComponent,
    FacilityPredictorDataTableComponent,
    FacilityPredictorDataEntryComponent,
    FacilityPredictorDataBulkUpdateComponent,
    ProcessGeneralFileComponent,
    SelectWorksheetComponent,
    IdentifyColumnsComponent,
    MapMetersToFacilitiesComponent,
    MapPredictorsToFacilitiesComponent,
    ProcessMetersComponent,
    ProcessMeterReadingsComponent,
    ProcessPredictorsComponent,
    ProcessPredictorReadingsComponent,
    SubmitImportDataComponent,
    DataManagementImportFooterComponent,
    DataManagementHomeComponent,
    AccountCustomDataComponent,
    SidebarItemActivePipe,
    FacilityMeterDataQualityReportComponent,
    FacilityPredictorDataQualityReportComponent,
    MeterChargesVisualizationComponent,
    MeterChargesTimeseriesComponent,
    MeterChargesCorrelationPlotComponent,
    MeterChargesCorrelationsComponent,
    UpdateWeatherPredictorsModalComponent,
    FacilityEnergyUseGroupComponent,
    FacilityEnergyUseGroupManagementComponent,
    FacilityEnergyUseEquipmentComponent,
    UtilityTypeOptionsPipe,
    SizeLabelPipe,
    EquipmentUnitOptionsPipe,
    FacilityEnergyUsesComponent,
    FacilityEnergyUsesGroupSetupComponent,
    FacilityEnergyUseEquipmentFormComponent,
    OrderEquipmentEnergyUseFormsPipe,
    YearOptionsFilterPipe,
    FacilityEnergyUsesSummaryComponent,
    FacilityEnergyUsesGroupSummaryComponent,
    EnergyUseFormAvailableSourcesPipe,
    EnergyUseFormIncludedSourcesPipe,
    EnergyUseSourceFormGroupPipe,
    EquipmentDetailsFormComponent,
    EquipmentUtilityDataFormComponent,
    AnnualOperatingConditionsFormComponent,
    EnergyUseEquipmentInvalidPipe,
    EnergyUseUnitPipe,
    ConvertEnergyUseResultPipe,
    FacilityEnergyUsesSummaryTableComponent,
    OrderFacilityEnergyUsesSummaryTablePipe,
    FacilityEnergyUsesGroupSummaryTableComponent,
    OrderFacilityEnergyUsesGroupSummaryTablePipe,
    ProcessFootprintToolFileComponent,
    FootprintUploadSelectFacilityComponent,
    FacilityEnergyUsesSummaryChartComponent,
    FacilityEnergyUsesGroupSummaryChartComponent,
    FootprintUploadSelectFacilityComponent,
    FacilityEnergyUsesGroupFootprintComponent,
    FacilityEnergyUsesFootprintComponent,
    FacilityEnergyUsesGroupFootprintTableComponent,
    FacilityEnergyUsesGroupFootprintChartComponent,
    FacilityEnergyUsesFootprintTableComponent,
    FacilityEnergyUsesFootprintChartComponent,
    OrderFacilityEnergyUsesFootprintTableBySourcePipe,
    OrderFacilityEnergyUsesFootprintTableByMeterGroupPipe,
    OrderFacilityEnergyUsesGroupFootprintTableByMeterGroupPipe,
    OrderFacilityEnergyUsesGroupFootprintTableBySourcePipe,
    FacilityEnergyUsesResultDropdownComponent,
    EnergyUseDataFormComponent,
    FacilityEnergyUsesSetupOptionsComponent,
    NewEquipmentGroupSetupOptionsComponent,
    EditExistingGroupsSetupOptionsComponent,
    AddYearSetupOptionsComponent,
    FacilityMeterGroupsComponent,
    FacilityMeterDataComponent,
    FacilityEnergyUsesModifyAnnualDataComponent,
    EnergyUseGroupModifyAnnualDataFormComponent,
    MeterGroupSourceConflictPipe,
    MapMeterGroupsToEquipmentComponent,
    ConfirmEnergyUsesUploadComponent,
    FacilityEnergyUsesSankeyComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SettingsFormsModule,
    HelperPipesModule,
    FormsModule,
    NgbPaginationModule,
    TableItemsDropdownModule,
    SharedMeterContentModule,
    SharedPredictorsContentModule,
    LabelWithTooltipModule,
    DragDropModule,
    ReactiveFormsModule,
    CustomDatabaseModule,
    DataManagementSidePanelModule,
    SharedDataQualityReportMetersModule,
    SharedDataQualityReportPredictorsModule
]
})
export class DataManagementModule { }

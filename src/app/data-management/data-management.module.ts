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
    MeterChargesCorrelationsComponent
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

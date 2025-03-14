import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataWizardComponent } from './data-wizard.component';
import { DataWizardSidebarComponent } from './data-wizard-sidebar/data-wizard-sidebar.component';
import { RouterModule } from '@angular/router';
import { AccountSetupComponent } from './account-setup/account-setup.component';
import { AccountFacilitiesComponent } from './account-facilities/account-facilities.component';
import { FacilityDataComponent } from './account-facilities/facility-data/facility-data.component';
import { FacilitySetupComponent } from './account-facilities/facility-data/facility-setup/facility-setup.component';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { DataWizardImportComponent } from './data-wizard-import/data-wizard-import.component';
import { UploadFilesComponent } from './data-wizard-import/upload-files/upload-files.component';
import { ProcessTemplateFileComponent } from './data-wizard-import/process-template-file/process-template-file.component';
import { ProcessTemplateFacilitiesComponent } from './data-wizard-import/process-template-file/process-template-facilities/process-template-facilities.component';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { FormsModule } from '@angular/forms';
import { MeterGroupOptionsPipe } from './data-wizard-import/shared-process-file/process-meters/meter-group-options.pipe';
import { FacilityMetersTableComponent } from './account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FacilityMeterComponent } from './account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilitiesListComponent } from './account-facilities/facilities-list/facilities-list.component';
import { DataWizardHelpPanelComponent } from './data-wizard-help-panel/data-wizard-help-panel.component';
import { WizardSidebarFacilitiesListPipe } from './data-wizard-sidebar/wizard-sidebar-facilities-list.pipe';
import { TableItemsDropdownModule } from '../shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from '../shared/shared-meter-content/shared-meter-content.module';
import { FacilityMeterMonthlyDataComponent } from './account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component';
import { SharedPredictorsContentModule } from "../shared/shared-predictors-content/shared-predictors-content.module";
import { FacilityPredictorsTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component';
import { FacilityPredictorComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component';
import { FacilityPredictorDataTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component';
import { FacilityPredictorDataEntryComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component';
import { FacilityPredictorDataBulkUpdateComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component';
import { ProcessGeneralFileComponent } from './data-wizard-import/process-general-file/process-general-file.component';
import { SelectWorksheetComponent } from './data-wizard-import/process-general-file/select-worksheet/select-worksheet.component';
import { LabelWithTooltipModule } from '../shared/label-with-tooltip/label-with-tooltip.module';
import { IdentifyColumnsComponent } from './data-wizard-import/process-general-file/identify-columns/identify-columns.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MapMetersToFacilitiesComponent } from './data-wizard-import/process-general-file/map-meters-to-facilities/map-meters-to-facilities.component';
import { MapPredictorsToFacilitiesComponent } from './data-wizard-import/process-general-file/map-predictors-to-facilities/map-predictors-to-facilities.component';
import { ProcessMetersComponent } from './data-wizard-import/shared-process-file/process-meters/process-meters.component';
import { ProcessMeterReadingsComponent } from './data-wizard-import/shared-process-file/process-meter-readings/process-meter-readings.component';
import { InspectMeterDataSummaryTableComponent } from './data-wizard-import/shared-process-file/process-meter-readings/inspect-meter-data-summary-table/inspect-meter-data-summary-table.component';
import { MeterDataSummaryTableComponent } from './data-wizard-import/shared-process-file/process-meter-readings/meter-data-summary-table/meter-data-summary-table.component';
import { ProcessPredictorsComponent } from './data-wizard-import/shared-process-file/process-predictors/process-predictors.component';
import { ProcessPredictorReadingsComponent } from './data-wizard-import/shared-process-file/process-predictor-readings/process-predictor-readings.component';
import { SubmitImportDataComponent } from './data-wizard-import/shared-process-file/submit-import-data/submit-import-data.component';


@NgModule({
  declarations: [
    DataWizardComponent,
    DataWizardSidebarComponent,
    AccountSetupComponent,
    AccountFacilitiesComponent,
    FacilityDataComponent,
    FacilitySetupComponent,
    DataWizardImportComponent,
    UploadFilesComponent,
    ProcessTemplateFileComponent,
    ProcessTemplateFacilitiesComponent,
    MeterGroupOptionsPipe,
    FacilityMetersTableComponent,
    FacilityMeterComponent,
    FacilitiesListComponent,
    DataWizardHelpPanelComponent,
    WizardSidebarFacilitiesListPipe,
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
    SubmitImportDataComponent
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
    DragDropModule
  ]
})
export class DataWizardModule { }

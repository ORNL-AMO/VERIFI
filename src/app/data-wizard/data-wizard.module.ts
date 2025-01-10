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
import { ProcessTemplateMeterReadingsComponent } from './data-wizard-import/process-template-file/process-template-meter-readings/process-template-meter-readings.component';
import { ProcessTemplateMetersComponent } from './data-wizard-import/process-template-file/process-template-meters/process-template-meters.component';
import { ProcessTemplatePredictorsComponent } from './data-wizard-import/process-template-file/process-template-predictors/process-template-predictors.component';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { FormsModule } from '@angular/forms';
import { MeterGroupOptionsPipe } from './data-wizard-import/process-template-file/process-template-meters/meter-group-options.pipe';
import { FacilityMetersTableComponent } from './account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FacilityMeterComponent } from './account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilitiesListComponent } from './account-facilities/facilities-list/facilities-list.component';
import { DataWizardHelpPanelComponent } from './data-wizard-help-panel/data-wizard-help-panel.component';
import { WizardSidebarFacilitiesListPipe } from './data-wizard-sidebar/wizard-sidebar-facilities-list.pipe';
import { TableItemsDropdownModule } from '../shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from '../shared/shared-meter-content/shared-meter-content.module';
import { FacilityMeterMonthlyDataComponent } from './account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component';
import { MeterDataSummaryTableComponent } from './data-wizard-import/process-template-file/process-template-meter-readings/meter-data-summary-table/meter-data-summary-table.component';
import { InspectMeterDataSummaryTableComponent } from './data-wizard-import/process-template-file/process-template-meter-readings/inspect-meter-data-summary-table/inspect-meter-data-summary-table.component';
import { SharedPredictorsContentModule } from "../shared/shared-predictors-content/shared-predictors-content.module";
import { FacilityPredictorsTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component';
import { FacilityPredictorComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component';
import { FacilityPredictorDataTableComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component';
import { FacilityPredictorDataEntryComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component';
import { FacilityPredictorDataBulkUpdateComponent } from './account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component';


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
    ProcessTemplateMeterReadingsComponent,
    ProcessTemplateMetersComponent,
    ProcessTemplatePredictorsComponent,
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
    FacilityPredictorDataBulkUpdateComponent
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
    SharedPredictorsContentModule
]
})
export class DataWizardModule { }

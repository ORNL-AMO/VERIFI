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
import { EditMeterFormModule } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.module';
import { FacilityMetersComponent } from './account-facilities/facility-data/facility-meters/facility-meters.component';
import { FacilityMetersTableComponent } from './account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FacilityMeterComponent } from './account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilityPredictorsComponent } from './account-facilities/facility-data/facility-predictors/facility-predictors.component';
import { FacilitiesListComponent } from './account-facilities/facilities-list/facilities-list.component';


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
    FacilityMetersComponent,
    FacilityMetersTableComponent,
    FacilityMeterComponent,
    FacilityPredictorsComponent,
    FacilitiesListComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SettingsFormsModule,
    HelperPipesModule,
    FormsModule,
    EditMeterFormModule,
    NgbPaginationModule
  ]
})
export class DataWizardModule { }

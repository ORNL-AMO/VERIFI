import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDataHelpComponent } from './upload-data-help.component';
import { SelectWorksheetHelpComponent } from './select-worksheet-help/select-worksheet-help.component';
import { FileUploadHelpComponent } from './file-upload-help/file-upload-help.component';
import { IdentifyColumnsHelpComponent } from './identify-columns-help/identify-columns-help.component';
import { SetFacilityMetersHelpComponent } from './set-facility-meters-help/set-facility-meters-help.component';
import { SetFacilityPredictorsHelpComponent } from './set-facility-predictors-help/set-facility-predictors-help.component';
import { ManageMetersHelpComponent } from './manage-meters-help/manage-meters-help.component';
import { TemplateFacilitiesHelpComponent } from './template-facilities-help/template-facilities-help.component';
import { ConfirmReadingsHelpComponent } from './confirm-readings-help/confirm-readings-help.component';
import { ConfirmPredictorsHelpComponent } from './confirm-predictors-help/confirm-predictors-help.component';
import { SubmitHelpComponent } from './submit-help/submit-help.component';



@NgModule({
  declarations: [
    UploadDataHelpComponent,
    SelectWorksheetHelpComponent,
    FileUploadHelpComponent,
    IdentifyColumnsHelpComponent,
    SetFacilityMetersHelpComponent,
    SetFacilityPredictorsHelpComponent,
    ManageMetersHelpComponent,
    TemplateFacilitiesHelpComponent,
    ConfirmReadingsHelpComponent,
    ConfirmPredictorsHelpComponent,
    SubmitHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    UploadDataHelpComponent
  ]
})
export class UploadDataHelpModule { }

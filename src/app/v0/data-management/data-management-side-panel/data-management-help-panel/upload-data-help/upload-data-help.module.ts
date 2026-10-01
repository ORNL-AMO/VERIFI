import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDataHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/upload-data-help.component';
import { SelectWorksheetHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/select-worksheet-help/select-worksheet-help.component';
import { FileUploadHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/file-upload-help/file-upload-help.component';
import { IdentifyColumnsHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/identify-columns-help/identify-columns-help.component';
import { SetFacilityMetersHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/set-facility-meters-help/set-facility-meters-help.component';
import { SetFacilityPredictorsHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/set-facility-predictors-help/set-facility-predictors-help.component';
import { ManageMetersHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/manage-meters-help/manage-meters-help.component';
import { TemplateFacilitiesHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/template-facilities-help/template-facilities-help.component';
import { ConfirmReadingsHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/confirm-readings-help/confirm-readings-help.component';
import { ConfirmPredictorsHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/confirm-predictors-help/confirm-predictors-help.component';
import { SubmitHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/submit-help/submit-help.component';



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

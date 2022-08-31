import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDataComponent } from './upload-data.component';
import { RouterModule } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { DataSetupComponent } from './data-setup/data-setup.component';
import { DataSetupBannerComponent } from './data-setup/data-setup-banner/data-setup-banner.component';
import { FileSetupComponent } from './data-setup/file-setup/file-setup.component';
import { SelectWorksheetComponent } from './data-setup/file-setup/select-worksheet/select-worksheet.component';
import { FormsModule } from '@angular/forms';
import { IdentifyColumnsComponent } from './data-setup/file-setup/identify-columns/identify-columns.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ManageMetersComponent } from './data-setup/file-setup/manage-meters/manage-meters.component';
import { SetFacilityPredictorsComponent } from './data-setup/file-setup/set-facility-predictors/set-facility-predictors.component';
import { SetFacilityMetersComponent } from './data-setup/file-setup/set-facility-meters/set-facility-meters.component';
import { TemplateFacilitiesComponent } from './data-setup/file-setup/template-facilities/template-facilities.component';
import { EditMeterFormModule } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.module';



@NgModule({
  declarations: [
    UploadDataComponent,
    FileUploadComponent,
    DataSetupComponent,
    DataSetupBannerComponent,
    FileSetupComponent,
    SelectWorksheetComponent,
    IdentifyColumnsComponent,
    ManageMetersComponent,
    SetFacilityPredictorsComponent,
    SetFacilityMetersComponent,
    TemplateFacilitiesComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    EditMeterFormModule
  ]
})
export class UploadDataModule { }

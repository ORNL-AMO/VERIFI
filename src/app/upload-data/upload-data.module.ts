import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDataComponent } from './upload-data.component';
import { RouterModule } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { DataSetupComponent } from './data-setup/data-setup.component';
import { DataSetupBannerComponent } from './data-setup/data-setup-banner/data-setup-banner.component';
import { FileSetupComponent } from './data-setup/file-setup/file-setup.component';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ManageMetersComponent } from './data-setup/file-setup/manage-meters/manage-meters.component';
import { SetFacilityPredictorsComponent } from './data-setup/file-setup/set-facility-predictors/set-facility-predictors.component';
import { SetFacilityMetersComponent } from './data-setup/file-setup/set-facility-meters/set-facility-meters.component';
import { TemplateFacilitiesComponent } from './data-setup/file-setup/template-facilities/template-facilities.component';
import { ConfirmReadingsComponent } from './data-setup/file-setup/confirm-readings/confirm-readings.component';
import { ConfirmPredictorsComponent } from './data-setup/file-setup/confirm-predictors/confirm-predictors.component';
import { LabelWithTooltipModule } from '../shared/label-with-tooltip/label-with-tooltip.module';
import { MeterGroupOptionsPipe2 } from './data-setup/file-setup/manage-meters/meter-group-options.pipe';
import { SharedMeterContentModule } from '../shared/shared-meter-content/shared-meter-content.module';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';


@NgModule({
  declarations: [
    UploadDataComponent,
    FileUploadComponent,
    DataSetupComponent,
    DataSetupBannerComponent,
    FileSetupComponent,
    // SelectWorksheetComponent,
    // IdentifyColumnsComponent,
    ManageMetersComponent,
    SetFacilityPredictorsComponent,
    SetFacilityMetersComponent,
    TemplateFacilitiesComponent,
    ConfirmReadingsComponent,
    ConfirmPredictorsComponent,
    MeterGroupOptionsPipe2
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    SharedMeterContentModule,
    LabelWithTooltipModule,
    HelperPipesModule
  ]
})
export class UploadDataModule { }

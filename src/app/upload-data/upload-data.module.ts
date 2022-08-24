import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDataComponent } from './upload-data.component';
import { RouterModule } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { DataSetupComponent } from './data-setup/data-setup.component';
import { DataSetupBannerComponent } from './data-setup/data-setup-banner/data-setup-banner.component';
import { FileSetupComponent } from './data-setup/file-setup/file-setup.component';



@NgModule({
  declarations: [
    UploadDataComponent,
    FileUploadComponent,
    DataSetupComponent,
    DataSetupBannerComponent,
    FileSetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class UploadDataModule { }

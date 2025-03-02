import { Route } from "@angular/router";
import { DataSetupComponent } from "src/app/upload-data/data-setup/data-setup.component";
import { ConfirmAndSubmitComponent } from "src/app/upload-data/data-setup/file-setup/confirm-and-submit/confirm-and-submit.component";
import { ConfirmPredictorsComponent } from "src/app/upload-data/data-setup/file-setup/confirm-predictors/confirm-predictors.component";
import { ConfirmReadingsComponent } from "src/app/upload-data/data-setup/file-setup/confirm-readings/confirm-readings.component";
import { FileSetupComponent } from "src/app/upload-data/data-setup/file-setup/file-setup.component";
// import { IdentifyColumnsComponent } from "src/app/upload-data/data-setup/file-setup/identify-columns/identify-columns.component";
import { ManageMetersComponent } from "src/app/upload-data/data-setup/file-setup/manage-meters/manage-meters.component";
// import { SelectWorksheetComponent } from "src/app/upload-data/data-setup/file-setup/select-worksheet/select-worksheet.component";
import { SetFacilityMetersComponent } from "src/app/upload-data/data-setup/file-setup/set-facility-meters/set-facility-meters.component";
import { SetFacilityPredictorsComponent } from "src/app/upload-data/data-setup/file-setup/set-facility-predictors/set-facility-predictors.component";
import { TemplateFacilitiesComponent } from "src/app/upload-data/data-setup/file-setup/template-facilities/template-facilities.component";
import { FileUploadComponent } from "src/app/upload-data/file-upload/file-upload.component";
import { UploadDataComponent } from "src/app/upload-data/upload-data.component";


export const UploadRoutes: Route  =   {
    path: 'upload',
    component: UploadDataComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'file-upload' },
      { path: 'file-upload', component: FileUploadComponent },
      {
        path: 'data-setup',
        component: DataSetupComponent,
        children: [
          {
            path: 'file-setup/:id',
            component: FileSetupComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'select-worksheet' },
              // { path: 'select-worksheet', component: SelectWorksheetComponent },
              // { path: 'identify-columns', component: IdentifyColumnsComponent },
              { path: 'set-facility-meters', component: SetFacilityMetersComponent },
              { path: 'set-facility-predictors', component: SetFacilityPredictorsComponent },
              { path: 'manage-meters', component: ManageMetersComponent },
              { path: 'template-facilities', component: TemplateFacilitiesComponent },
              { path: 'confirm-readings', component: ConfirmReadingsComponent },
              { path: 'confirm-predictors', component: ConfirmPredictorsComponent },
              { path: 'submit', component: ConfirmAndSubmitComponent }
            ]
          },
        ]
      },

    ]
  }
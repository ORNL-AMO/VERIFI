import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PredictorsComponent } from './predictors.component';
import { PredictorsManagementComponent } from './predictors-management/predictors-management.component';
import { PredictorTableComponent } from './predictors-management/predictor-table/predictor-table.component';
import { EditPredictorFormComponent } from './predictors-management/edit-predictor-form/edit-predictor-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    PredictorsComponent,
    PredictorsManagementComponent,
    PredictorTableComponent,
    EditPredictorFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class PredictorsModule { }

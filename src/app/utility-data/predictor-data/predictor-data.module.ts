import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditPredictorEntryRowComponent } from './edit-predictor-entry-row/edit-predictor-entry-row.component';
import { EditPredictorsComponent } from './edit-predictors/edit-predictors.component';
import { PredictorDataComponent } from './predictor-data.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    PredictorDataComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class PredictorDataModule { }

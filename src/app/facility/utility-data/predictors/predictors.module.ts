import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PredictorsComponent } from './predictors.component';
import { PredictorsManagementComponent } from './predictors-management/predictors-management.component';
import { PredictorTableComponent } from './predictors-management/predictor-table/predictor-table.component';
import { EditPredictorFormComponent } from './predictors-management/edit-predictor-form/edit-predictor-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataComponent } from './predictors-data/predictors-data.component';
import { PredictorsDataTableComponent } from './predictors-data/predictors-data-table/predictors-data-table.component';
import { PredictorsDataFormComponent } from './predictors-data/predictors-data-form/predictors-data-form.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';



@NgModule({
  declarations: [
    PredictorsComponent,
    PredictorsManagementComponent,
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataComponent,
    PredictorsDataTableComponent,
    PredictorsDataFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    TableItemsDropdownModule,
    HelperPipesModule,
    CalculatingSpinnerModule
  ]
})
export class PredictorsModule { }

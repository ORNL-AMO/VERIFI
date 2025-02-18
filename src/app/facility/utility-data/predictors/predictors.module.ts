import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PredictorsComponent } from './predictors.component';
import { PredictorsManagementComponent } from './predictors-management/predictors-management.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataComponent } from './predictors-data/predictors-data.component';
import { PredictorsDataFormComponent } from './predictors-data/predictors-data-form/predictors-data-form.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { SharedPredictorsContentModule } from 'src/app/shared/shared-predictors-content/shared-predictors-content.module';
import { LabelWithTooltipModule } from "../../../shared/label-with-tooltip/label-with-tooltip.module";
import { EditPredictorComponent } from './edit-predictor/edit-predictor.component';
import { CalculatedPredictorDataUpdateComponent } from './predictors-data/calculated-predictor-data-update/calculated-predictor-data-update.component';
import { OrderCalculatedPredictorDataPipe } from './predictors-data/calculated-predictor-data-update/order-calculated-predictor-data.pipe';



@NgModule({
  declarations: [
    PredictorsComponent,
    PredictorsManagementComponent,
    PredictorsDataComponent,
    PredictorsDataFormComponent,
    EditPredictorComponent,
    CalculatedPredictorDataUpdateComponent,
    OrderCalculatedPredictorDataPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    TableItemsDropdownModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedPredictorsContentModule,
    LabelWithTooltipModule
  ]
})
export class PredictorsModule { }

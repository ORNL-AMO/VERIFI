import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PredictorsComponent } from '@v0/data-evaluation/facility/utility-data/predictors/predictors.component';
import { PredictorsManagementComponent } from '@v0/data-evaluation/facility/utility-data/predictors/predictors-management/predictors-management.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataComponent } from '@v0/data-evaluation/facility/utility-data/predictors/predictors-data/predictors-data.component';
import { PredictorsDataFormComponent } from '@v0/data-evaluation/facility/utility-data/predictors/predictors-data/predictors-data-form/predictors-data-form.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from '@v0/shared/table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from '@v0/shared/calculating-spinner/calculating-spinner.module';
import { SharedPredictorsContentModule } from '@v0/shared/shared-predictors-content/shared-predictors-content.module';
import { LabelWithTooltipModule } from "@v0/shared/label-with-tooltip/label-with-tooltip.module";
import { EditPredictorComponent } from '@v0/data-evaluation/facility/utility-data/predictors/edit-predictor/edit-predictor.component';

@NgModule({
  declarations: [
    PredictorsComponent,
    PredictorsManagementComponent,
    PredictorsDataComponent,
    PredictorsDataFormComponent,
    EditPredictorComponent
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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictorTableComponent } from './predictor-table/predictor-table.component';
import { EditPredictorFormComponent } from './edit-predictor-form/edit-predictor-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataTableComponent } from './predictors-data-table/predictors-data-table.component';
import { OrderPredictorDataTablePipe } from './predictors-data-table/order-predictor-data-table.pipe';
import { TableItemsDropdownModule } from '../table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';



@NgModule({
  declarations: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    OrderPredictorDataTablePipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableItemsDropdownModule,
    HelperPipesModule,
    NgbPaginationModule
  ],
  exports: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent
  ]
})
export class SharedPredictorsContentModule { }

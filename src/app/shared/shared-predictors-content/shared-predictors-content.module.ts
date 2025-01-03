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
import { LabelWithTooltipModule } from '../label-with-tooltip/label-with-tooltip.module';
import { WeatherDataSubLabelComponent } from './weather-data-sub-label/weather-data-sub-label.component';



@NgModule({
  declarations: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    OrderPredictorDataTablePipe,
    WeatherDataSubLabelComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableItemsDropdownModule,
    HelperPipesModule,
    NgbPaginationModule,
    LabelWithTooltipModule
  ],
  exports: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    OrderPredictorDataTablePipe,
    WeatherDataSubLabelComponent
  ]
})
export class SharedPredictorsContentModule { }

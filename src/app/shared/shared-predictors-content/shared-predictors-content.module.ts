import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictorTableComponent } from './predictor-table/predictor-table.component';
import { EditPredictorFormComponent } from './edit-predictor-form/edit-predictor-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataTableComponent } from './predictors-data-table/predictors-data-table.component';
import { OrderPredictorDataTablePipe } from './predictors-data-table/order-predictor-data-table.pipe';
import { TableItemsDropdownModule } from '../table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from '../helper-pipes/_helper-pipes.module';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { LabelWithTooltipModule } from '../label-with-tooltip/label-with-tooltip.module';
import { WeatherDataSubLabelComponent } from './weather-data-sub-label/weather-data-sub-label.component';
import { EditPredictorDataEntryFormComponent } from './edit-predictor-data-entry-form/edit-predictor-data-entry-form.component';
import { CalculatingSpinnerModule } from '../calculating-spinner/calculating-spinner.module';
import { CalculatedPredictorDataUpdateComponent } from './calculated-predictor-data-update/calculated-predictor-data-update.component';
import { OrderCalculatedPredictorDataPipe } from './calculated-predictor-data-update/order-calculated-predictor-data.pipe';
import { WeatherStationModalComponent } from './weather-station-modal/weather-station-modal.component';



@NgModule({
  declarations: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    OrderPredictorDataTablePipe,
    WeatherDataSubLabelComponent,
    EditPredictorDataEntryFormComponent,
    CalculatedPredictorDataUpdateComponent,
    OrderCalculatedPredictorDataPipe,
    WeatherStationModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableItemsDropdownModule,
    HelperPipesModule,
    NgbPaginationModule,
    LabelWithTooltipModule,
    CalculatingSpinnerModule
  ],
  exports: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    OrderPredictorDataTablePipe,
    WeatherDataSubLabelComponent,
    EditPredictorDataEntryFormComponent,
    CalculatedPredictorDataUpdateComponent,
    WeatherStationModalComponent
  ]
})
export class SharedPredictorsContentModule { }

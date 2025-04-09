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
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { OrderPredictorDataTablePipe } from './predictors-data/predictors-data-table/order-predictor-data-table.pipe';
import { CalculatedPredictorDataUpdateComponent } from './predictors-data/calculated-predictor-data-update/calculated-predictor-data-update.component';
import { OrderCalculatedPredictorDataPipe } from './predictors-data/calculated-predictor-data-update/order-calculated-predictor-data.pipe';
import { WeatherDataSubLabelComponent } from './weather-data-sub-label/weather-data-sub-label.component';
import { LabelWithTooltipModule } from "../../../shared/label-with-tooltip/label-with-tooltip.module";
import { WeatherStationModalComponent } from './predictors-management/edit-predictor-form/weather-station-modal/weather-station-modal.component';



@NgModule({
  declarations: [
    PredictorsComponent,
    PredictorsManagementComponent,
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataComponent,
    PredictorsDataTableComponent,
    PredictorsDataFormComponent,
    OrderPredictorDataTablePipe,
    CalculatedPredictorDataUpdateComponent,
    OrderCalculatedPredictorDataPipe,
    WeatherDataSubLabelComponent,
    WeatherStationModalComponent
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
    LabelWithTooltipModule
]
})
export class PredictorsModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictorTableComponent } from '@v0/shared/shared-predictors-content/predictor-table/predictor-table.component';
import { EditPredictorFormComponent } from '@v0/shared/shared-predictors-content/edit-predictor-form/edit-predictor-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PredictorsDataTableComponent } from '@v0/shared/shared-predictors-content/predictors-data-table/predictors-data-table.component';
import { TableItemsDropdownModule } from '@v0/shared/table-items-dropdown/table-items-dropdown.module';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { LabelWithTooltipModule } from '@v0/shared/label-with-tooltip/label-with-tooltip.module';
import { WeatherDataSubLabelComponent } from '@v0/shared/shared-predictors-content/weather-data-sub-label/weather-data-sub-label.component';
import { EditPredictorDataEntryFormComponent } from '@v0/shared/shared-predictors-content/edit-predictor-data-entry-form/edit-predictor-data-entry-form.component';
import { CalculatingSpinnerModule } from '@v0/shared/calculating-spinner/calculating-spinner.module';
import { CalculatedPredictorDataUpdateComponent } from '@v0/shared/shared-predictors-content/calculated-predictor-data-update/calculated-predictor-data-update.component';
import { OrderCalculatedPredictorDataPipe } from '@v0/shared/shared-predictors-content/calculated-predictor-data-update/order-calculated-predictor-data.pipe';
import { WeatherStationModalComponent } from '@v0/shared/shared-predictors-content/weather-station-modal/weather-station-modal.component';
import { SharedDataQualityReportPredictorsModule } from '@v0/shared/shared-data-quality-report-predictor/shared-data-quality-report-predictor.module';



@NgModule({
  declarations: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
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
    CalculatingSpinnerModule,
    SharedDataQualityReportPredictorsModule
  ],
  exports: [
    PredictorTableComponent,
    EditPredictorFormComponent,
    PredictorsDataTableComponent,
    WeatherDataSubLabelComponent,
    EditPredictorDataEntryFormComponent,
    CalculatedPredictorDataUpdateComponent,
    WeatherStationModalComponent
  ]
})
export class SharedPredictorsContentModule { }

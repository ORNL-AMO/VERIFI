import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditPredictorEntryRowComponent } from './edit-predictor-entry-row/edit-predictor-entry-row.component';
import { EditPredictorsComponent } from './edit-predictors/edit-predictors.component';
import { PredictorDataComponent } from './predictor-data.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { ManagePredictorsComponent } from './manage-predictors/manage-predictors.component';
import { RouterModule } from '@angular/router';
import { PredictorEntriesComponent } from './predictor-entries/predictor-entries.component';
import { PredictorTabsComponent } from './predictor-tabs/predictor-tabs.component';
import { EditPredictorComponent } from './manage-predictors/edit-predictor/edit-predictor.component';
import { EditPredictorEntryComponent } from './predictor-entries/edit-predictor-entry/edit-predictor-entry.component';
import { PredictorsTableComponent } from './manage-predictors/predictors-table/predictors-table.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { PredictorEntriesTableComponent } from './predictor-entries/predictor-entries-table/predictor-entries-table.component';
import { DegreeDaysComponent } from './degree-days/degree-days.component';
import { WeatherStationTableComponent } from './degree-days/weather-station-table/weather-station-table.component';
import { DegreeDaysMonthlyGraphComponent } from './degree-days/degree-days-monthly-graph/degree-days-monthly-graph.component';
import { DegreeDaysMonthlyTableComponent } from './degree-days/degree-days-monthly-table/degree-days-monthly-table.component';
import { DegreeDaysDailyTableComponent } from './degree-days/degree-days-daily-table/degree-days-daily-table.component';
import { DegreeDaysDailyGraphComponent } from './degree-days/degree-days-daily-graph/degree-days-daily-graph.component';
import { DegreeDaysHourlyGraphComponent } from './degree-days/degree-days-hourly-graph/degree-days-hourly-graph.component';
import { DegreeDaysHourlyTableComponent } from './degree-days/degree-days-hourly-table/degree-days-hourly-table.component';



@NgModule({
  declarations: [
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    PredictorDataComponent,
    ManagePredictorsComponent,
    PredictorEntriesComponent,
    PredictorTabsComponent,
    EditPredictorComponent,
    EditPredictorEntryComponent,
    PredictorsTableComponent,
    PredictorEntriesTableComponent,
    DegreeDaysComponent,
    WeatherStationTableComponent,
    DegreeDaysMonthlyGraphComponent,
    DegreeDaysMonthlyTableComponent,
    DegreeDaysDailyTableComponent,
    DegreeDaysDailyGraphComponent,
    DegreeDaysHourlyGraphComponent,
    DegreeDaysHourlyTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    TableItemsDropdownModule,
    RouterModule,
    LabelWithTooltipModule
  ]
})
export class PredictorDataModule { }

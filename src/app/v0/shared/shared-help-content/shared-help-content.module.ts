import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSettingsHelpComponent } from '@v0/shared/shared-help-content/account-settings-help/account-settings-help.component';
import { FacilitySettingsHelpComponent } from '@v0/shared/shared-help-content/facility-settings-help/facility-settings-help.component';
import { CalendarizationHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/calendarization-help/calendarization-help.component';
import { EnergyConsumptionHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/energy-consumption-help/energy-consumption-help.component';
import { UtilityMeterHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/energy-consumption-help/utility-meter-help/utility-meter-help.component';
import { MetersHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/energy-consumption-help/meters-help/meters-help.component';
import { EditMeterHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/energy-consumption-help/edit-meter-help/edit-meter-help.component';
import { EditBillHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/energy-consumption-help/edit-bill-help/edit-bill-help.component';
import { MeterGroupingHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/meter-grouping-help/meter-grouping-help.component';
import { ManagePredictorsHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/predictors-data-help/manage-predictors-help/manage-predictors-help.component';
import { PredictorEntriesHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/predictors-data-help/predictor-entries-help/predictor-entries-help.component';
import { PredictorEntryFormHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/predictors-data-help/predictor-entry-form-help/predictor-entry-form-help.component';
import { PredictorFormHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/predictors-data-help/predictor-form-help/predictor-form-help.component';
import { PredictorsDataHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/predictors-data-help/predictors-data-help.component';
import { FacilityUtilityHelpComponent } from '@v0/shared/shared-help-content/facility-utility-help/facility-utility-help.component';
import { WeatherDataHelpComponent } from '@v0/shared/shared-help-content/weather-data-help/weather-data-help.component';
import { WeatherStationsHelpComponent } from '@v0/shared/shared-help-content/weather-data-help/weather-stations-help/weather-stations-help.component';
import { AnnualStationHelpComponent } from '@v0/shared/shared-help-content/weather-data-help/annual-station-help/annual-station-help.component';
import { DailyStationHelpComponent } from '@v0/shared/shared-help-content/weather-data-help/daily-station-help/daily-station-help.component';
import { MonthlyStationHelpComponent } from '@v0/shared/shared-help-content/weather-data-help/monthly-station-help/monthly-station-help.component';



@NgModule({
  declarations: [
    AccountSettingsHelpComponent,
    FacilitySettingsHelpComponent,
    CalendarizationHelpComponent,
    EnergyConsumptionHelpComponent,
    UtilityMeterHelpComponent,
    MetersHelpComponent,
    EditMeterHelpComponent,
    EditBillHelpComponent,
    MeterGroupingHelpComponent,
    ManagePredictorsHelpComponent,
    PredictorEntriesHelpComponent,
    PredictorEntryFormHelpComponent,
    PredictorFormHelpComponent,
    PredictorsDataHelpComponent,
    FacilityUtilityHelpComponent,
    WeatherDataHelpComponent,
    WeatherStationsHelpComponent,
    AnnualStationHelpComponent,
    DailyStationHelpComponent,
    MonthlyStationHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountSettingsHelpComponent,
    FacilitySettingsHelpComponent,
    CalendarizationHelpComponent,
    EnergyConsumptionHelpComponent,
    UtilityMeterHelpComponent,
    MetersHelpComponent,
    EditMeterHelpComponent,
    EditBillHelpComponent,
    MeterGroupingHelpComponent,
    ManagePredictorsHelpComponent,
    PredictorEntriesHelpComponent,
    PredictorEntryFormHelpComponent,
    PredictorFormHelpComponent,
    PredictorsDataHelpComponent,
    FacilityUtilityHelpComponent,
    WeatherDataHelpComponent
  ]
})
export class SharedHelpContentModule { }

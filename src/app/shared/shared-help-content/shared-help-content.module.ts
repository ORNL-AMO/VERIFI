import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSettingsHelpComponent } from './account-settings-help/account-settings-help.component';
import { FacilitySettingsHelpComponent } from './facility-settings-help/facility-settings-help.component';
import { CalendarizationHelpComponent } from './facility-utility-help/calendarization-help/calendarization-help.component';
import { EnergyConsumptionHelpComponent } from './facility-utility-help/energy-consumption-help/energy-consumption-help.component';
import { UtilityMeterHelpComponent } from './facility-utility-help/energy-consumption-help/utility-meter-help/utility-meter-help.component';
import { MetersHelpComponent } from './facility-utility-help/energy-consumption-help/meters-help/meters-help.component';
import { EditMeterHelpComponent } from './facility-utility-help/energy-consumption-help/edit-meter-help/edit-meter-help.component';
import { EditBillHelpComponent } from './facility-utility-help/energy-consumption-help/edit-bill-help/edit-bill-help.component';
import { MeterGroupingHelpComponent } from './facility-utility-help/meter-grouping-help/meter-grouping-help.component';
import { ManagePredictorsHelpComponent } from './facility-utility-help/predictors-data-help/manage-predictors-help/manage-predictors-help.component';
import { PredictorEntriesHelpComponent } from './facility-utility-help/predictors-data-help/predictor-entries-help/predictor-entries-help.component';
import { PredictorEntryFormHelpComponent } from './facility-utility-help/predictors-data-help/predictor-entry-form-help/predictor-entry-form-help.component';
import { PredictorFormHelpComponent } from './facility-utility-help/predictors-data-help/predictor-form-help/predictor-form-help.component';
import { PredictorsDataHelpComponent } from './facility-utility-help/predictors-data-help/predictors-data-help.component';
import { FacilityUtilityHelpComponent } from './facility-utility-help/facility-utility-help.component';



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
    FacilityUtilityHelpComponent
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
    FacilityUtilityHelpComponent
  ]
})
export class SharedHelpContentModule { }

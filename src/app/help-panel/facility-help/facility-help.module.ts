import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHelpComponent } from './facility-help.component';
import { FacilityHomeHelpComponent } from './facility-home-help/facility-home-help.component';
import { FacilityOverviewHelpComponent } from './facility-overview-help/facility-overview-help.component';
import { FacilitySettingsHelpComponent } from './facility-settings-help/facility-settings-help.component';
import { FacilityUtilityHelpComponent } from './facility-utility-help/facility-utility-help.component';
import { FacilityVisualizationHelpComponent } from './facility-visualization-help/facility-visualization-help.component';
import { FacilityAnalysisHelpComponent } from './facility-analysis-help/facility-analysis-help.component';
import { EnergyConsumptionHelpComponent } from './facility-utility-help/energy-consumption-help/energy-consumption-help.component';
import { MeterGroupingHelpComponent } from './facility-utility-help/meter-grouping-help/meter-grouping-help.component';
import { PredictorsDataHelpComponent } from './facility-utility-help/predictors-data-help/predictors-data-help.component';
import { CalendarizationHelpComponent } from './facility-utility-help/calendarization-help/calendarization-help.component';



@NgModule({
  declarations: [
    FacilityHelpComponent,
    FacilityHomeHelpComponent,
    FacilityOverviewHelpComponent,
    FacilitySettingsHelpComponent,
    FacilityUtilityHelpComponent,
    FacilityVisualizationHelpComponent,
    FacilityAnalysisHelpComponent,
    EnergyConsumptionHelpComponent,
    MeterGroupingHelpComponent,
    PredictorsDataHelpComponent,
    CalendarizationHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FacilityHelpComponent
  ]
})
export class FacilityHelpModule { }

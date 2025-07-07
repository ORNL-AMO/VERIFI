import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHelpComponent } from './facility-help.component';
import { FacilityHomeHelpComponent } from './facility-home-help/facility-home-help.component';
import { FacilityOverviewHelpComponent } from './facility-overview-help/facility-overview-help.component';
import { FacilityUtilityHelpComponent } from './facility-utility-help/facility-utility-help.component';
import { FacilityVisualizationHelpComponent } from './facility-visualization-help/facility-visualization-help.component';
import { FacilityAnalysisHelpComponent } from './facility-analysis-help/facility-analysis-help.component';
import { EnergyConsumptionHelpComponent } from './facility-utility-help/energy-consumption-help/energy-consumption-help.component';
import { MeterGroupingHelpComponent } from './facility-utility-help/meter-grouping-help/meter-grouping-help.component';
import { PredictorsDataHelpComponent } from './facility-utility-help/predictors-data-help/predictors-data-help.component';
import { CalendarizationHelpComponent } from './facility-utility-help/calendarization-help/calendarization-help.component';
import { MetersHelpComponent } from './facility-utility-help/energy-consumption-help/meters-help/meters-help.component';
import { UtilityMeterHelpComponent } from './facility-utility-help/energy-consumption-help/utility-meter-help/utility-meter-help.component';
import { EditMeterHelpComponent } from './facility-utility-help/energy-consumption-help/edit-meter-help/edit-meter-help.component';
import { EditBillHelpComponent } from './facility-utility-help/energy-consumption-help/edit-bill-help/edit-bill-help.component';
import { FacilityAnalysisDashboardHelpComponent } from './facility-analysis-help/facility-analysis-dashboard-help/facility-analysis-dashboard-help.component';
import { FacilityAnalysisSetupHelpComponent } from './facility-analysis-help/facility-analysis-setup-help/facility-analysis-setup-help.component';
import { GroupAnalysisHelpComponent } from './facility-analysis-help/group-analysis-help/group-analysis-help.component';
import { FacilityAnalysisResultsHelpComponent } from './facility-analysis-help/facility-analysis-results-help/facility-analysis-results-help.component';
import { AccountAnalysisInFacilityHelpComponent } from './facility-analysis-help/account-analysis-in-facility-help/account-analysis-in-facility-help.component';
import { ManagePredictorsHelpComponent } from './facility-utility-help/predictors-data-help/manage-predictors-help/manage-predictors-help.component';
import { PredictorEntriesHelpComponent } from './facility-utility-help/predictors-data-help/predictor-entries-help/predictor-entries-help.component';
import { PredictorFormHelpComponent } from './facility-utility-help/predictors-data-help/predictor-form-help/predictor-form-help.component';
import { PredictorEntryFormHelpComponent } from './facility-utility-help/predictors-data-help/predictor-entry-form-help/predictor-entry-form-help.component';
import { SharedHelpContentModule } from 'src/app/shared/shared-help-content/shared-help-content.module';



@NgModule({
  declarations: [
    FacilityHelpComponent,
    FacilityHomeHelpComponent,
    FacilityOverviewHelpComponent,
    FacilityUtilityHelpComponent,
    FacilityVisualizationHelpComponent,
    FacilityAnalysisHelpComponent,
    EnergyConsumptionHelpComponent,
    MeterGroupingHelpComponent,
    PredictorsDataHelpComponent,
    CalendarizationHelpComponent,
    MetersHelpComponent,
    UtilityMeterHelpComponent,
    EditMeterHelpComponent,
    EditBillHelpComponent,
    FacilityAnalysisDashboardHelpComponent,
    FacilityAnalysisSetupHelpComponent,
    GroupAnalysisHelpComponent,
    FacilityAnalysisResultsHelpComponent,
    AccountAnalysisInFacilityHelpComponent,
    ManagePredictorsHelpComponent,
    PredictorEntriesHelpComponent,
    PredictorFormHelpComponent,
    PredictorEntryFormHelpComponent
  ],
  imports: [
    CommonModule,
    SharedHelpContentModule
  ],
  exports: [
    FacilityHelpComponent
  ]
})
export class FacilityHelpModule { }

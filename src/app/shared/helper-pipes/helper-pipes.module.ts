import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomNumberPipe } from './custom-number.pipe';
import { NaicsListPipe } from './naics-list.pipe';
import { OrderByPipe } from './order-by.pipe';
import { SettingsLabelPipe } from './settings-label.pipe';
import { YearOptionsPipe } from './year-options.pipe';
import { GroupNamePipe } from './group-name.pipe';
import { FacilityNamePipe } from './facility-name.pipe';
import { MonthLabelPipe } from './month-label.pipe';
import { PhoneNumberPipe } from './phone-number.pipe';
import { ScopeLabelPipe } from './scope-label.pipe';
import { AgreementTypeLabelPipe } from './agreement-type-label.pipe';
import { YearDisplayPipe } from './year-display.pipe';
import { AnalysisTypeLabelPipe } from './analysis-type-label.pipe';
import { TotalPipe } from './total.pipe';
import { AnalysisCategoryPipe } from './analysis-category.pipe';
import { EmissionsDisplayPipe } from './emissions-display.pipe';
import { MeterSourceColorPipe } from './meter-source-color.pipe';
import { FacilityMetersListPipe } from './facility-meters-list.pipe';
import { FacilityPredictorListPipe } from './facility-predictor-list.pipe';
import { NaicsDisplayPipe } from './naics-display.pipe';

@NgModule({
  declarations: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe,
    AnalysisTypeLabelPipe,
    TotalPipe,
    AnalysisCategoryPipe,
    EmissionsDisplayPipe,
    MeterSourceColorPipe,
    FacilityMetersListPipe,
    FacilityPredictorListPipe,
    NaicsDisplayPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe,
    AnalysisTypeLabelPipe,
    TotalPipe,
    AnalysisCategoryPipe,
    EmissionsDisplayPipe,
    MeterSourceColorPipe,
    FacilityMetersListPipe,
    FacilityPredictorListPipe,
    NaicsDisplayPipe
  ]
})
export class HelperPipesModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomNumberPipe } from './custom-number.pipe';
import { NaicsListPipe } from './naics-list.pipe';
import { OrderByPipe } from './order-by.pipe';
import { SettingsLabelPipe } from './settings-label.pipe';
import { YearOptionsPipe } from './year-options.pipe';
import { PredictorsOrderByPipe } from './predictors-order-by.pipe';
import { GroupNamePipe } from './group-name.pipe';
import { FacilityNamePipe } from './facility-name.pipe';
import { MonthLabelPipe } from './month-label.pipe';
import { PhoneNumberPipe } from './phone-number.pipe';
import { ScopeLabelPipe } from './scope-label.pipe';
import { AgreementTypeLabelPipe } from './agreement-type-label.pipe';
import { YearDisplayPipe } from './year-display.pipe';

@NgModule({
  declarations: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    PredictorsOrderByPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe
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
    PredictorsOrderByPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe
  ]
})
export class HelperPipesModule { }

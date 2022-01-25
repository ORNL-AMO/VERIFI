import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomNumberPipe } from './custom-number.pipe';
import { NaicsListPipe } from './naics-list.pipe';
import { OrderByPipe } from './order-by.pipe';
import { SettingsLabelPipe } from './settings-label.pipe';
import { YearOptionsPipe } from './year-options.pipe';
import { PredictorsOrderByPipe } from './predictors-order-by.pipe';
import { GroupNamePipe } from './group-name.pipe';

@NgModule({
  declarations: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    PredictorsOrderByPipe,
    GroupNamePipe
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
    GroupNamePipe
  ]
})
export class HelperPipesModule { }

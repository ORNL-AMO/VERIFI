import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilityDataComponent } from './utility-data.component';
import { PredictorDataModule } from './predictor-data/predictor-data.module';
import { MeterGroupingModule } from './meter-grouping/meter-grouping.module';
import { EnergyConsumptionModule } from './energy-consumption/energy-consumption.module';
import { CalanderizationModule } from './calanderization/calanderization.module';
import { UtilityBannerComponent } from './utility-banner/utility-banner.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '../../shared/helper-pipes/helper-pipes.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LabelWithTooltipModule } from '../../shared/label-with-tooltip/label-with-tooltip.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    UtilityDataComponent,
    UtilityBannerComponent
  ],
  imports: [
    CommonModule,
    PredictorDataModule,
    MeterGroupingModule,
    EnergyConsumptionModule,
    CalanderizationModule,
    FormsModule,
    HelperPipesModule,
    NgbModule,
    LabelWithTooltipModule,
    RouterModule,
    ReactiveFormsModule,
  ]
})
export class UtilityDataModule { }

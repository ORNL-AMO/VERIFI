import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilityDataComponent } from './utility-data.component';
import { VisualizationModule } from './visualization/visualization.module';
import { UploadDataModule } from './upload-data/upload-data.module';
import { PredictorDataModule } from './predictor-data/predictor-data.module';
import { MeterGroupingModule } from './meter-grouping/meter-grouping.module';
import { EnergyConsumptionModule } from './energy-consumption/energy-consumption.module';
import { CalanderizationModule } from './calanderization/calanderization.module';
import { SiteToSourceOptionComponent } from './site-to-source-option/site-to-source-option.component';
import { UtilityBannerComponent } from './utility-banner/utility-banner.component';

@NgModule({
  declarations: [
    UtilityDataComponent,
    SiteToSourceOptionComponent,
    UtilityBannerComponent
  ],
  imports: [
    CommonModule,
    VisualizationModule,
    UploadDataModule,
    PredictorDataModule,
    MeterGroupingModule,
    EnergyConsumptionModule,
    CalanderizationModule
  ]
})
export class UtilityDataModule { }

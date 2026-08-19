import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilityDataComponent } from '@v0/data-evaluation/facility/utility-data/utility-data.component';
import { EnergyConsumptionModule } from '@v0/data-evaluation/facility/utility-data/energy-consumption/energy-consumption.module';
import { UtilityBannerComponent } from '@v0/data-evaluation/facility/utility-data/utility-banner/utility-banner.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LabelWithTooltipModule } from '@shared/label-with-tooltip/label-with-tooltip.module';
import { RouterModule } from '@angular/router';
import { PredictorsModule } from '@v0/data-evaluation/facility/utility-data/predictors/predictors.module';
import { CalanderizationComponent } from '@v0/data-evaluation/facility/utility-data/calanderization/calanderization.component';
import { SharedMeterContentModule } from "@shared/shared-meter-content/shared-meter-content.module";
import { MeterGroupingComponent } from '@v0/data-evaluation/facility/utility-data/meter-grouping/meter-grouping.component';

@NgModule({
  declarations: [
    UtilityDataComponent,
    UtilityBannerComponent,
    CalanderizationComponent,
    MeterGroupingComponent
  ],
  imports: [
    CommonModule,
    EnergyConsumptionModule,
    FormsModule,
    HelperPipesModule,
    NgbModule,
    LabelWithTooltipModule,
    RouterModule,
    ReactiveFormsModule,
    PredictorsModule,
    SharedMeterContentModule
]
})
export class UtilityDataModule { }

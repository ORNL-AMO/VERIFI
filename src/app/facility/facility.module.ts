import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityComponent } from './facility.component';
import { FacilityBannerComponent } from './facility-banner/facility-banner.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { FacilitySettingsComponent } from './facility-settings/facility-settings.component';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { UtilityDataModule } from './utility-data/utility-data.module';
import { AnalysisModule } from './analysis/analysis.module';
import { VisualizationModule } from './visualization/visualization.module';
import { FacilityHomeModule } from './facility-home/facility-home.module';
import { FacilityOverviewModule } from './facility-overview/facility-overview.module';


@NgModule({
  declarations: [
    FacilityComponent,
    FacilityBannerComponent,
    FacilitySettingsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HelperPipesModule,
    SettingsFormsModule,
    UtilityDataModule,
    AnalysisModule,
    VisualizationModule,
    FacilityHomeModule,
    FacilityOverviewModule
  ]
})
export class FacilityModule { }

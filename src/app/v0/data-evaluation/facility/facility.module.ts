import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityComponent } from '@v0/data-evaluation/facility/facility.component';
import { FacilityBannerComponent } from '@v0/data-evaluation/facility/facility-banner/facility-banner.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { FacilitySettingsComponent } from '@v0/data-evaluation/facility/facility-settings/facility-settings.component';
import { SettingsFormsModule } from '@v0/shared/settings-forms/settings-forms.module';
import { UtilityDataModule } from '@v0/data-evaluation/facility/utility-data/utility-data.module';
import { AnalysisModule } from '@v0/data-evaluation/facility/analysis/analysis.module';
import { VisualizationModule } from '@v0/data-evaluation/facility/visualization/visualization.module';
import { FacilityHomeModule } from '@v0/data-evaluation/facility/facility-home/facility-home.module';
import { FacilityOverviewModule } from '@v0/data-evaluation/facility/facility-overview/facility-overview.module';
import { FacilityReportsModule } from '@v0/data-evaluation/facility/facility-reports/facility-reports.module';


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
    FacilityOverviewModule,
    FacilityReportsModule
  ]
})
export class FacilityModule { }

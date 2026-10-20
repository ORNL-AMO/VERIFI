import { OverlayModule } from '@angular/cdk/overlay';
import { ReportsNavComponent } from './reports-nav/reports-nav.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ImportStepperComponent } from '@app/v1/account/imports/import-stepper/import-stepper.component';
import { AnalysisStageNavigationComponent } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { StatusAttentionComponent } from '@app/v1/shared/status/status-attention/status-attention.component';
import { StatusEvaluationMessageComponent } from '@app/v1/shared/status/status-evaluation-message/status-evaluation-message.component';
import { SectionNavComponent } from './section-nav.component';
import { FacilityPickerComponent } from './facility-picker/facility-picker.component';
import { WorkspaceContextComponent } from './workspace-context/workspace-context.component';
import { SettingsNavComponent } from './settings-nav/settings-nav.component';
import { DataNavComponent } from './data-nav/data-nav.component';
import { ImportsNavComponent } from './imports-nav/imports-nav.component';
import { AnalysisNavComponent } from './analysis-nav/analysis-nav.component';
import { ResourceNavGroupComponent } from './resource-nav-group/resource-nav-group.component';

@NgModule({
  declarations: [ReportsNavComponent, SectionNavComponent, FacilityPickerComponent, WorkspaceContextComponent, SettingsNavComponent, DataNavComponent, ImportsNavComponent, AnalysisNavComponent, ResourceNavGroupComponent],
  imports: [OverlayModule,CommonModule, ReactiveFormsModule, RouterModule, IconsModule, ImportStepperComponent, AnalysisStageNavigationComponent, StatusAttentionComponent, StatusEvaluationMessageComponent],
  exports: [SectionNavComponent, FacilityPickerComponent]
})
export class SectionNavModule { }

import { AccountAnalysisDetailsSlideoutComponent } from '@app/v1/analysis/account/details/account-analysis-details-slideout.component';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ItemSettingsModule } from '../time-series/settings/item-settings/item-settings.module';
import { AnalysisSourceEditorComponent } from './source-editor/analysis-source-editor.component';

@NgModule({ declarations: [AnalysisSourceEditorComponent], imports: [AccountAnalysisDetailsSlideoutComponent, ReportsSharedModule, AnalysisDetailsSlideoutComponent, CommonModule, ReactiveFormsModule, ItemSettingsModule], exports: [AnalysisSourceEditorComponent] })
export class AnalysisEditorsModule { }

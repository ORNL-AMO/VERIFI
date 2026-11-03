import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ContributionHeatmapComponent } from '../contribution-heatmap/contribution-heatmap.component';
import { AnalysisResultNumberPipe } from '../number/analysis-result-number.pipe';
import { GroupContributionsComponent } from './group-contributions.component';

@NgModule({ declarations: [GroupContributionsComponent], imports: [CommonModule, IconComponent, ContributionHeatmapComponent, AnalysisResultNumberPipe],
  exports: [GroupContributionsComponent] })
export class GroupContributionsModule { }

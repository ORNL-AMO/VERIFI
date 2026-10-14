import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';
import { StatusAttentionComponent, statusAttentionDescription } from '@app/v1/shared/status/status-attention/status-attention.component';

export interface AnalysisNavigationStage {
  readonly id: string;
  readonly label: string;
  readonly route: readonly string[];
  readonly current: boolean;
  readonly completed: boolean;
  readonly hasBlockingErrors: boolean;
  readonly canOpen: boolean;
  readonly kind?: 'analysis' | 'group' | 'facility' | 'used-by';
  readonly icon?: IconName;
  readonly attention?: StatusAttentionSummary;
}

@Component({
  selector: 'app-analysis-stage-navigation',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, IconComponent, StatusAttentionComponent],
  templateUrl: './analysis-stage-navigation.component.html',
  styleUrls: ['./analysis-stage-navigation.component.css']
})
export class AnalysisStageNavigationComponent {
  readonly stages = input.required<readonly AnalysisNavigationStage[]>();
  readonly ariaLabel = input.required<string>();
  readonly layout = input<'vertical' | 'horizontal'>('vertical');
  readonly withContext = input(false);
  readonly views = computed(() => this.stages().map(stage => {
    // Blocking errors take precedence over completion and semantic stage icons.
    const tracksCompletion = stage.kind === undefined || stage.kind === 'analysis' || stage.kind === 'group';
    const markerIcon: IconName | undefined = stage.hasBlockingErrors
      ? 'badgeAlert'
      : tracksCompletion && stage.completed
        ? 'checkmarkBadge'
        : stage.kind === 'analysis' || stage.kind === 'group'
          ? undefined
          : stage.kind === 'facility' ? 'chartAnalysis' : stage.kind === 'used-by' ? 'link' : stage.icon || 'analysis';
    const markerLabel = stage.hasBlockingErrors ? 'Has blocking errors'
      : tracksCompletion && stage.completed ? 'Complete'
        : stage.kind === 'analysis' || stage.kind === 'group' ? 'Not complete'
          : stage.kind === 'facility' ? 'Results' : stage.kind === 'used-by' ? 'Dependencies' : '';
    return {
      ...stage,
      markerIcon,
      markerLabel,
      attentionDescription: stage.attention ? statusAttentionDescription(stage.attention) : ''
    };
  }));
}

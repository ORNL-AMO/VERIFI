import { Component, ViewChild, computed, input } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ContributionHeatmapView, contributionHeatmapOption } from './contribution-heatmap.view';

@Component({
  selector: 'app-contribution-heatmap',
  standalone: true,
  imports: [EChartsChartDirective, IconComponent],
  templateUrl: './contribution-heatmap.component.html',
  styleUrls: ['./contribution-heatmap.component.css']
})
export class ContributionHeatmapComponent {
  readonly view = input.required<ContributionHeatmapView>();
  readonly scopeLabel = input.required<'Facility' | 'Group'>();
  readonly downloadFileName = input.required<string>();
  readonly compact = input(false);
  readonly title = computed(() => `${this.scopeLabel()} Contributions by Fiscal Year`);
  readonly regionLabel = computed(() => `Scrollable ${this.scopeLabel().toLowerCase()} contribution heatmap`);
  readonly chartLabel = computed(() => `${this.scopeLabel()} percent contribution heatmap by fiscal year. Green indicates savings and red indicates losses.`);
  readonly downloadLabel = computed(() => `Download ${this.scopeLabel().toLowerCase()} contribution heatmap as PNG`);
  readonly chartOption = computed(() => contributionHeatmapOption(
    this.view(), `${this.scopeLabel()} contribution`, this.compact()
  ));
  readonly chartHeight = computed(() => this.compact()
    ? Math.max(220, (this.view().labels.length * 36) + 118)
    : Math.max(320, (this.view().labels.length * 48) + 150));
  readonly chartWidth = computed(() => Math.max(640, (this.view().years.length * 104) + 240));

  @ViewChild(EChartsChartDirective) private chart?: EChartsChartDirective;

  download(): void {
    this.chart?.downloadPng(this.downloadFileName());
  }
}

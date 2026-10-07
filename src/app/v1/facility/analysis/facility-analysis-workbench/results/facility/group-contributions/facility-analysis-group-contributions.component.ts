import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, inject } from '@angular/core';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultNumberPipe } from '../../presentation/number/analysis-result-number.pipe';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import {
  FacilityGroupContributionsView,
  facilityGroupContributionsView
} from '../../presentation/facility-analysis-result.view';

@Component({
  selector: 'app-facility-analysis-group-contributions',
  standalone: true,
  imports: [
    CommonModule,
    EChartsChartDirective,
    IconComponent,
    AnalysisResultNumberPipe,
    AnalysisResultStatusComponent
  ],
  templateUrl: './facility-analysis-group-contributions.component.html',
  styleUrls: ['./facility-analysis-group-contributions.component.css']
})
export class FacilityAnalysisGroupContributionsComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly view = computed(() => {
    const state = this.results.state();
    const groupNames = new Map(this.context.meterGroups().map(group => [group.guid, group.name]));
    return facilityGroupContributionsView(
      state.state === 'ready' ? state.annual : [],
      state.state === 'ready' ? state.groups : [],
      groupNames
    );
  });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
  readonly hasContributionData = computed(() => this.view().groups.length > 0 && this.view().years.length > 0);
  readonly heatmapOption = computed(() => groupContributionsHeatmapOption(this.view()));
  readonly heatmapHeight = computed(() => Math.max(320, (this.view().groups.length * 48) + 150));
  readonly heatmapWidth = computed(() => Math.max(640, (this.view().years.length * 104) + 240));

  @ViewChild('contributionHeatmap', { read: EChartsChartDirective })
  private contributionHeatmap?: EChartsChartDirective;

  downloadHeatmap(): void {
    this.contributionHeatmap?.downloadPng('facility-group-contributions');
  }
}

export function groupContributionsHeatmapOption(view: FacilityGroupContributionsView): V1EChartsOption {
  const values = view.years.flatMap((year, yearIndex) => year.groups.map((group, groupIndex) => [
    yearIndex,
    groupIndex,
    group.contributionPercent
  ]));
  const maxMagnitude = Math.max(1, ...values.map(value => Math.abs(Number(value[2]))));

  return {
    tooltip: {
      trigger: 'item',
      renderMode: 'richText',
      formatter: params => heatmapTooltip(params, view)
    },
    legend: { show: false },
    grid: { top: 20, right: 28, bottom: 76, left: 16, containLabel: true },
    xAxis: {
      type: 'category',
      position: 'top',
      data: view.years.map(year => `${year.year} (${formatCompactContributionPercent(year.totalContributionPercent)})`),
      axisTick: { show: false },
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: view.groups.map(group => group.groupName),
      axisTick: { show: false },
      axisLabel: { width: 168, overflow: 'break', lineHeight: 15 }
    },
    visualMap: {
      type: 'continuous',
      min: -maxMagnitude,
      max: maxMagnitude,
      dimension: 2,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      calculable: false,
      text: ['Savings', 'Loss'],
      formatter: value => formatContributionPercent(Number(value)),
      inRange: {
        color: ['var(--v1-danger)', 'var(--v1-panel)', 'var(--v1-success)']
      }
    },
    series: [{
      name: 'Group contribution',
      type: 'heatmap',
      data: values,
      label: {
        show: true,
        formatter: params => {
          const value = heatmapValue(params);
          const style = Math.abs(value) >= maxMagnitude * .45 ? 'inverse' : 'normal';
          return `{${style}|${formatContributionPercent(value)}}`;
        },
        rich: {
          inverse: { color: '#ffffff', fontWeight: 800 },
          normal: { color: 'var(--v1-text)', fontWeight: 800 }
        }
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: 'var(--v1-surface)'
      },
      emphasis: {
        itemStyle: {
          borderWidth: 3,
          borderColor: 'var(--v1-text)'
        }
      }
    }]
  } as V1EChartsOption;
}

function heatmapTooltip(params: unknown, view: FacilityGroupContributionsView): string {
  const value = heatmapTuple(params);
  if (!value) return '';
  const [yearIndex, groupIndex, contribution] = value;
  const year = view.years[yearIndex]?.year ?? '';
  const group = view.groups[groupIndex]?.groupName ?? '';
  return `${group}\nFiscal Year ${year}\nContribution: ${formatContributionPercent(contribution)}`;
}

function heatmapValue(params: unknown): number {
  return heatmapTuple(params)?.[2] ?? 0;
}

function heatmapTuple(params: unknown): [number, number, number] | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const tuple = value.slice(0, 3).map(Number);
  return tuple.every(Number.isFinite) ? tuple as [number, number, number] : undefined;
}

function formatContributionPercent(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}%`;
}

function formatCompactContributionPercent(value: number): string {
  return formatContributionPercent(value).replace(/^(-?)0\./, '$1.');
}

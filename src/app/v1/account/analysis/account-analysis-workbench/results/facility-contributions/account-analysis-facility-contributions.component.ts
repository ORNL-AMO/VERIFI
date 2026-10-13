import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import {
  ACCOUNT_ANALYSIS_ORIGIN_QUERY,
  AccountAnalysisFacilitySelectionService
} from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import {
  AccountFacilityContributionsView,
  accountFacilityContributionsView
} from '../presentation/account-analysis-facility-results.view';

@Component({
  selector: 'app-account-analysis-facility-contributions',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EChartsChartDirective,
    IconComponent,
    AnalysisResultNumberPipe,
    AnalysisResultStatusComponent
  ],
  templateUrl: './account-analysis-facility-contributions.component.html',
  styleUrls: ['./account-analysis-facility-contributions.component.css']
})
export class AccountAnalysisFacilityContributionsComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
  readonly view = computed(() => {
    const state = this.results.state();
    const names = new Map(this.context.facilities().map(facility => [facility.guid, facility.name]));
    return state.state === 'ready'
      ? accountFacilityContributionsView(state.annual, state.facilitySummaries, names)
      : EMPTY_VIEW;
  });
  readonly drillInLinks = computed(() => {
    const account = this.context.account();
    const analysis = this.context.analysis();
    if (!account || !analysis) return {} as Readonly<Record<string, FacilityGroupContributionsLink>>;
    return Object.fromEntries(this.view().facilities.map(facility => [
      facility.facilityGuid,
      {
        route: this.navigation.facilityAnalysisResultsRoute(facility.facilityGuid, facility.analysisGuid, 'group-contributions'),
        queryParams: {
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.accountGuid]: account.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.analysisGuid]: analysis.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: facility.facilityGuid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.resultTab]: 'facility-contributions'
        }
      }
    ]));
  });
  readonly hasContributionData = computed(() => this.view().facilities.length > 0 && this.view().years.length > 0);
  readonly heatmapOption = computed(() => facilityContributionsHeatmapOption(this.view()));
  readonly heatmapHeight = computed(() => Math.max(220, (this.view().facilities.length * 36) + 118));
  readonly heatmapWidth = computed(() => Math.max(640, (this.view().years.length * 104) + 240));

  @ViewChild('contributionHeatmap', { read: EChartsChartDirective })
  private contributionHeatmap?: EChartsChartDirective;

  downloadHeatmap(): void {
    this.contributionHeatmap?.downloadPng('account-facility-contributions');
  }
}

const EMPTY_VIEW: AccountFacilityContributionsView = { facilities: [], years: [] };

interface FacilityGroupContributionsLink {
  readonly route: readonly string[];
  readonly queryParams: Readonly<Record<string, string>>;
}

export function facilityContributionsHeatmapOption(view: AccountFacilityContributionsView): V1EChartsOption {
  const values = view.years.flatMap((year, yearIndex) => year.facilities.map((facility, facilityIndex) => [
    yearIndex,
    facilityIndex,
    facility.contributionPercent
  ]));
  const maxMagnitude = Math.max(1, ...values.map(value => Math.abs(Number(value[2]))));
  return {
    tooltip: { trigger: 'item', renderMode: 'richText', formatter: params => heatmapTooltip(params, view) },
    legend: { show: false },
    grid: { top: 12, right: 28, bottom: 64, left: 16, containLabel: true },
    xAxis: {
      type: 'category', position: 'top',
      data: view.years.map(year => `${year.year} (${formatCompactPercent(year.totalContributionPercent)})`),
      axisTick: { show: false }, splitArea: { show: true }
    },
    yAxis: {
      type: 'category', inverse: true, data: view.facilities.map(facility => facility.facilityName),
      axisTick: { show: false }, axisLabel: { width: 168, overflow: 'break', lineHeight: 15 }
    },
    visualMap: {
      type: 'continuous', min: -maxMagnitude, max: maxMagnitude, dimension: 2,
      orient: 'horizontal', left: 'center', bottom: 8, calculable: false,
      text: ['Savings', 'Loss'], formatter: value => formatPercent(Number(value)),
      inRange: { color: ['var(--v1-danger)', 'var(--v1-panel)', 'var(--v1-success)'] }
    },
    series: [{
      name: 'Facility contribution', type: 'heatmap', data: values,
      label: {
        show: true,
        formatter: params => {
          const value = heatmapValue(params);
          return `{${Math.abs(value) >= maxMagnitude * .45 ? 'inverse' : 'normal'}|${formatPercent(value)}}`;
        },
        rich: {
          inverse: { color: '#ffffff', fontWeight: 800 },
          normal: { color: 'var(--v1-text)', fontWeight: 800 }
        }
      },
      itemStyle: { borderWidth: 2, borderColor: 'var(--v1-surface)' },
      emphasis: { itemStyle: { borderWidth: 3, borderColor: 'var(--v1-text)' } }
    }]
  } as V1EChartsOption;
}

function heatmapTooltip(params: unknown, view: AccountFacilityContributionsView): string {
  const value = heatmapTuple(params);
  if (!value) return '';
  const [yearIndex, facilityIndex, contribution] = value;
  const year = view.years[yearIndex]?.year ?? '';
  const facility = view.facilities[facilityIndex]?.facilityName ?? '';
  return `${facility}\nFiscal Year ${year}\nContribution: ${formatPercent(contribution)}`;
}

function heatmapValue(params: unknown): number { return heatmapTuple(params)?.[2] ?? 0; }

function heatmapTuple(params: unknown): [number, number, number] | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const tuple = value.slice(0, 3).map(Number);
  return tuple.every(Number.isFinite) ? tuple as [number, number, number] : undefined;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}%`;
}

function formatCompactPercent(value: number): string { return formatPercent(value).replace(/^(-?)0\./, '$1.'); }

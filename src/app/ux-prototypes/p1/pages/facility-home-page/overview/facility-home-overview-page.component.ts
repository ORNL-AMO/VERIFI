import { Component, computed, inject } from '@angular/core';
import { P1RouteFacade } from '../../../p1-route.facade';
import { P1PanelTabId, P1SectionId, P1StatusTone } from '../../../p1.models';
import { P1OverviewChartConfig } from '../../../components/overview-chart/overview-chart.component';

interface P1FacilityHomeAction {
  title: string;
  summary: string;
  meta: string;
  icon: string;
  section: P1SectionId;
  detail: string;
  panelTab: P1PanelTabId;
  tone: P1StatusTone;
}

interface P1UtilitySummary {
  label: string;
  value: string;
  unit: string;
  trend: string;
  tone: P1StatusTone;
}

interface P1ReadinessItem {
  title: string;
  summary: string;
  statusLabel: string;
  tone: P1StatusTone;
  icon: string;
  action: P1FacilityHomeAction;
}

@Component({
  selector: 'app-p1-facility-home-overview-page',
  templateUrl: './facility-home-overview-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../../account-home-page/account-home-page.component.css',
    './facility-home-overview-page.component.css'
  ],
  standalone: false
})
export class P1FacilityHomeOverviewPageComponent {
  readonly facade = inject(P1RouteFacade);

  readonly themeSignature = computed(() => [
    this.facade.darkMode(),
    this.facade.palette(),
    this.facade.density(),
    this.facade.highContrast(),
    this.facade.glowAccents()
  ].join('|'));

  readonly setupTasks = computed(() => this.facade.setup().selectedFacilityTasks);
  readonly primaryAction = computed(() => this.getPrimaryAction());
  readonly launchpadActions = computed(() => this.getLaunchpadActions());
  readonly utilitySummaries = computed(() => this.getUtilitySummaries());
  readonly readinessItems = computed(() => this.getReadinessItems());
  readonly trendChart = computed<P1OverviewChartConfig>(() => this.getTrendChart());
  readonly mixChart = computed<P1OverviewChartConfig>(() => this.getMixChart());
  readonly readinessChart = computed<P1OverviewChartConfig>(() => this.getReadinessChart());

  routeFor(action: P1FacilityHomeAction, facilityId: string): Array<string> {
    return ['/p1', 'workspace', 'facility', facilityId, action.section, action.detail, action.panelTab];
  }

  private getPrimaryAction(): P1FacilityHomeAction {
    const facility = this.facade.selectedFacility();
    if (!facility || facility.meters === 0) {
      return this.makeAction('Add utility meters', 'Create the first facility meter so readings, charts, analysis, and reports have source data.', 'Needs setup', 'fa-gauge-high', 'data', 'meters', 'todos', 'danger');
    }
    if (facility.meterReadings === 0) {
      return this.makeAction('Add meter readings', 'Enter or import utility readings to unlock facility trends and analysis prep.', 'Ready', 'fa-file-import', 'data', 'meters', 'todos', 'warning');
    }
    if (facility.analyses === 0) {
      return this.makeAction('Create facility analysis', 'Use available meters, readings, groups, and predictors to set up performance analysis.', 'Recommended', 'fa-microscope', 'analysis', 'dashboard', 'todos', 'info');
    }
    return this.makeAction('Visualize facility data', 'Review time series and utility relationships before moving into reports.', 'Available', 'fa-chart-line', 'visualization', 'time-series', 'help', 'success');
  }

  private getLaunchpadActions(): Array<P1FacilityHomeAction> {
    const facility = this.facade.selectedFacility();
    const hasMeters = (facility?.meters ?? 0) > 0;
    const hasReadings = (facility?.meterReadings ?? 0) > 0;
    const hasPredictors = (facility?.predictors ?? 0) > 0;
    const hasAnalyses = (facility?.analyses ?? 0) > 0;
    return [
      this.makeAction('Meters', hasMeters ? 'Review meters, readings, monthly data, and meter groups.' : 'Start the facility by adding utility meters.', `${facility?.meters ?? 0} meters`, 'fa-gauge-high', 'data', 'meters', hasMeters ? 'help' : 'todos', hasMeters ? 'success' : 'danger'),
      this.makeAction('Predictors', hasPredictors ? 'Review production, weather, and operating drivers.' : 'Add drivers used by charts and facility analysis.', `${facility?.predictors ?? 0} predictors`, 'fa-cloud-sun', 'data', 'predictors', hasPredictors ? 'help' : 'todos', hasPredictors ? 'success' : 'warning'),
      this.makeAction('Energy Uses', 'Inspect equipment and footprint setup for this facility.', `${facility?.footprint ?? '0 equipment items'}`, 'fa-sitemap', 'data', 'energy-uses', 'help', (facility?.equipment ?? 0) > 0 ? 'success' : 'neutral'),
      this.makeAction('Visualize', hasReadings ? 'Explore time series, utility trends, and correlations.' : 'Charts become useful after meter readings are available.', hasReadings ? 'Ready' : 'Needs readings', 'fa-chart-line', 'visualization', 'time-series', 'help', hasReadings ? 'success' : 'warning'),
      this.makeAction('Analysis', hasAnalyses ? 'Open facility analysis setup and results.' : 'Create an analysis once data readiness is acceptable.', `${facility?.analyses ?? 0} analyses`, 'fa-microscope', 'analysis', 'dashboard', hasAnalyses ? 'results' : 'todos', hasAnalyses ? 'success' : 'warning'),
      this.makeAction('Reports', 'Prepare overview and analysis report concepts for this facility.', `${facility?.reports ?? 0} reports`, 'fa-file-lines', 'reports', 'overview-report', 'help', (facility?.reports ?? 0) > 0 ? 'success' : 'neutral'),
      this.makeAction('Settings', 'Confirm profile, units, goals, financial reporting, and staleness preferences.', 'Facility setup', 'fa-gear', 'settings', 'profile', 'help', 'info'),
      this.makeAction('Import', 'Jump to facility import paths for meter and predictor data.', 'Data intake', 'fa-upload', 'imports', 'meter-import', 'help', 'neutral')
    ];
  }

  private getUtilitySummaries(): Array<P1UtilitySummary> {
    const facility = this.facade.selectedFacility();
    const basis = this.getDataBasis();
    if (!facility || facility.meters === 0 || facility.meterReadings === 0) {
      return [
        { label: 'Energy use', value: '--', unit: 'MMBtu', trend: 'Add meter readings', tone: 'danger' },
        { label: 'Utility cost', value: '--', unit: 'USD', trend: 'Costs unavailable', tone: 'warning' },
        { label: 'Water', value: '--', unit: 'kgal', trend: 'Water meters optional', tone: 'neutral' }
      ];
    }
    return [
      { label: 'Energy use', value: this.formatNumber(basis * 118), unit: 'MMBtu', trend: '-4.8% vs prior year', tone: 'success' },
      { label: 'Utility cost', value: this.formatCurrency(basis * 925), unit: 'USD', trend: '+2.1% rate pressure', tone: 'warning' },
      { label: 'Water', value: this.formatNumber(Math.max(0, basis * 19)), unit: 'kgal', trend: 'Estimated from data volume', tone: 'info' }
    ];
  }

  private getReadinessItems(): Array<P1ReadinessItem> {
    const actions = this.getLaunchpadActions();
    return [
      this.readinessItem('Utility data', this.combineTaskSummary(['meters', 'meter-data', 'meter-groups']), actions[0], 'fa-gauge-high'),
      this.readinessItem('Predictor data', this.combineTaskSummary(['predictors']), actions[1], 'fa-cloud-sun'),
      this.readinessItem('Facility analysis', this.combineTaskSummary(['analysis']), actions[4], 'fa-microscope'),
      this.readinessItem('Reports', this.combineTaskSummary(['reports']), actions[5], 'fa-file-lines')
    ];
  }

  private getTrendChart(): P1OverviewChartConfig {
    const basis = this.getDataBasis();
    const hasData = (this.facade.selectedFacility()?.meterReadings ?? 0) > 0;
    const labels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const multiplier = hasData ? Math.max(6, basis) : 4;
    return {
      kind: 'trend',
      title: 'Monthly utility trend',
      subtitle: hasData ? 'Series shaped from current facility data volume.' : 'Estimated trend shown until meter readings exist.',
      labels,
      unit: 'Indexed use',
      series: [
        { name: 'Energy', values: labels.map((_, index) => Math.round(multiplier * (9 + index * .42 + Math.sin(index) * .8))), colorToken: '--prototype-green' },
        { name: 'Cost', values: labels.map((_, index) => Math.round(multiplier * (6 + index * .3 + Math.cos(index / 2) * .75))), colorToken: '--prototype-orange' },
        { name: 'Water', values: labels.map((_, index) => Math.round(multiplier * (3.5 + Math.sin(index / 1.6) * .65))), colorToken: '--prototype-blue' }
      ]
    };
  }

  private getMixChart(): P1OverviewChartConfig {
    const facility = this.facade.selectedFacility();
    const meters = Math.max(1, facility?.meters ?? 0);
    const readings = Math.max(1, facility?.meterReadings ?? 0);
    const equipment = Math.max(1, facility?.equipment ?? 0);
    return {
      kind: 'mix',
      title: 'Utility mix',
      subtitle: 'Breakdown aligned to the Overview energy, cost, emissions, and water categories.',
      labels: ['Electricity', 'Natural gas', 'Water', 'Other fuels'],
      unit: 'Share',
      series: [{
        name: 'Share',
        values: [
          Math.round(42 + meters * 2),
          Math.round(28 + readings % 17),
          Math.round(12 + equipment * 2),
          Math.round(8 + (meters + equipment) % 8)
        ],
        colorTokens: ['--prototype-blue', '--prototype-green', '--prototype-accent', '--prototype-orange']
      }]
    };
  }

  private getReadinessChart(): P1OverviewChartConfig {
    const tasks = this.setupTasks();
    return {
      kind: 'readiness',
      title: 'Setup readiness',
      subtitle: 'Current P1 setup task status for this facility.',
      labels: ['Complete', 'Review', 'Needs setup'],
      unit: 'Items',
      series: [{
        name: 'Tasks',
        values: [
          tasks.filter(task => task.status === 'complete').length,
          tasks.filter(task => task.status === 'ready').length,
          tasks.filter(task => task.status === 'blocked').length
        ],
        colorTokens: ['--prototype-green', '--prototype-orange', '--prototype-danger']
      }]
    };
  }

  private readinessItem(title: string, summary: string, action: P1FacilityHomeAction, icon: string): P1ReadinessItem {
    const tone = this.toneFromSummary(summary);
    return {
      title,
      summary,
      statusLabel: tone === 'success' ? 'Ready' : tone === 'danger' ? 'Needs setup' : 'Review',
      tone,
      icon,
      action
    };
  }

  private combineTaskSummary(keywords: Array<string>): string {
    const tasks = this.setupTasks().filter(task => keywords.some(keyword => task.id.includes(keyword)));
    if (tasks.length === 0) {
      return 'No matching setup task is available for this facility.';
    }
    const blocked = tasks.find(task => task.status === 'blocked');
    const ready = tasks.find(task => task.status === 'ready');
    return (blocked || ready || tasks[0]).summary;
  }

  private toneFromSummary(summary: string): P1StatusTone {
    if (summary.toLowerCase().includes('add') || summary.toLowerCase().includes('create')) {
      return summary.toLowerCase().includes('before') ? 'danger' : 'warning';
    }
    return 'success';
  }

  private makeAction(
    title: string,
    summary: string,
    meta: string,
    icon: string,
    section: P1SectionId,
    detail: string,
    panelTab: P1PanelTabId,
    tone: P1StatusTone
  ): P1FacilityHomeAction {
    return { title, summary, meta, icon, section, detail, panelTab, tone };
  }

  private getDataBasis(): number {
    const facility = this.facade.selectedFacility();
    if (!facility) {
      return 0;
    }
    return Math.max(facility.meterReadings, facility.meters * 12, 1);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }
}

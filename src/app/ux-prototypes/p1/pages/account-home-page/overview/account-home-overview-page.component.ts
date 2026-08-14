import { Component, computed, inject } from '@angular/core';
import { P1RouteFacade } from '../../../p1-route.facade';
import { P1PanelTabId, P1SectionId, P1SetupTask, P1StatusTone } from '../../../p1.models';
import { P1OverviewChartConfig } from '../../../components/overview-chart/overview-chart.component';

interface P1AccountHomeAction {
  title: string;
  summary: string;
  meta: string;
  icon: string;
  section: P1SectionId;
  detail: string;
  panelTab: P1PanelTabId;
  tone: P1StatusTone;
}

interface P1AccountUtilitySummary {
  label: string;
  value: string;
  unit: string;
  trend: string;
  tone: P1StatusTone;
}

interface P1AccountReadinessItem {
  title: string;
  summary: string;
  statusLabel: string;
  tone: P1StatusTone;
  icon: string;
  action: P1AccountHomeAction;
}

interface P1AccountOverviewCounts {
  facilities: number;
  meters: number;
  meterReadings: number;
  predictors: number;
  analyses: number;
  reports: number;
}

@Component({
  selector: 'app-p1-account-home-overview-page',
  templateUrl: './account-home-overview-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../account-home-page.component.css',
    './account-home-overview-page.component.css'
  ],
  standalone: false
})
export class P1AccountHomeOverviewPageComponent {
  readonly facade = inject(P1RouteFacade);

  readonly themeSignature = computed(() => [
    this.facade.darkMode(),
    this.facade.palette(),
    this.facade.density(),
    this.facade.highContrast(),
    this.facade.glowAccents()
  ].join('|'));

  readonly counts = computed(() => this.getCounts());
  readonly setupTasks = computed(() => this.facade.setup().allTasks);
  readonly primaryAction = computed(() => this.getPrimaryAction());
  readonly launchpadActions = computed(() => this.getLaunchpadActions());
  readonly utilitySummaries = computed(() => this.getUtilitySummaries());
  readonly readinessItems = computed(() => this.getReadinessItems());
  readonly trendChart = computed<P1OverviewChartConfig>(() => this.getTrendChart());
  readonly contributionChart = computed<P1OverviewChartConfig>(() => this.getContributionChart());
  readonly readinessChart = computed<P1OverviewChartConfig>(() => this.getReadinessChart());

  routeFor(action: P1AccountHomeAction): Array<string> {
    return ['/p1', 'workspace', 'account', action.section, action.detail, action.panelTab];
  }

  private getPrimaryAction(): P1AccountHomeAction {
    const counts = this.counts();
    if (counts.facilities === 0) {
      return this.makeAction('Add facilities', 'Create or import facility records so this account has places to hold utility data.', 'Needs setup', 'fa-industry', 'data', 'facilities', 'todos', 'danger');
    }
    if (counts.meters === 0) {
      return this.makeAction('Add utility meters', 'Start utility setup across facilities before entering readings or creating dashboards.', 'Needs meters', 'fa-gauge-high', 'data', 'meters', 'todos', 'danger');
    }
    if (counts.meterReadings === 0) {
      return this.makeAction('Add meter readings', 'Enter or import readings to unlock account trends, comparisons, and analysis setup.', 'Ready', 'fa-file-import', 'data', 'meters', 'todos', 'warning');
    }
    if (counts.analyses === 0) {
      return this.makeAction('Create account analysis', 'Use available facility data and facility analyses to begin portfolio performance review.', 'Recommended', 'fa-microscope', 'analysis', 'rollup', 'todos', 'info');
    }
    if (counts.reports > 0) {
      return this.makeAction('Review reports', 'Open account reports and generated report setup for the portfolio.', 'Available', 'fa-folder-open', 'reports', 'generated', 'help', 'success');
    }
    return this.makeAction('Prepare reports', 'Turn available account analysis and facility data into account report setup.', 'Next', 'fa-file-lines', 'reports', 'setup', 'help', 'success');
  }

  private getLaunchpadActions(): Array<P1AccountHomeAction> {
    const counts = this.counts();
    return [
      this.makeAction('Facilities', counts.facilities > 0 ? 'Review facility coverage and open facility workspaces.' : 'Create facilities before adding meters and readings.', `${counts.facilities} facilities`, 'fa-industry', 'data', 'facilities', counts.facilities > 0 ? 'help' : 'todos', counts.facilities > 0 ? 'success' : 'danger'),
      this.makeAction('Meters', counts.meters > 0 ? 'Scan meters and reading coverage across the account.' : 'Add utility meters for account facilities.', `${counts.meters} meters`, 'fa-gauge-high', 'data', 'meters', counts.meters > 0 ? 'help' : 'todos', counts.meters > 0 ? 'success' : 'danger'),
      this.makeAction('Predictors', counts.predictors > 0 ? 'Review production, weather, and operating drivers.' : 'Add drivers used in facility and account analysis.', `${counts.predictors} predictors`, 'fa-cloud-sun', 'data', 'predictors', counts.predictors > 0 ? 'help' : 'todos', counts.predictors > 0 ? 'success' : 'warning'),
      this.makeAction('Energy Uses', 'Review facility equipment and footprint coverage across the account.', 'Portfolio footprint', 'fa-sitemap', 'data', 'energy-uses', 'help', 'neutral'),
      this.makeAction('Visualize', counts.meterReadings > 0 ? 'Explore portfolio time series, trends, and facility comparison views.' : 'Charts become useful after meter readings are available.', counts.meterReadings > 0 ? 'Ready' : 'Needs readings', 'fa-chart-line', 'visualization', 'time-series', 'help', counts.meterReadings > 0 ? 'success' : 'warning'),
      this.makeAction('Account Analysis', counts.analyses > 0 ? 'Open account rollup and savings analysis views.' : 'Create account analysis after facility data is ready.', `${counts.analyses} analyses`, 'fa-microscope', 'analysis', 'rollup', counts.analyses > 0 ? 'results' : 'todos', counts.analyses > 0 ? 'success' : 'warning'),
      this.makeAction('Reports', counts.reports > 0 ? 'Review account and facility report records.' : 'Prepare account report setup from available analysis data.', `${counts.reports} reports`, 'fa-file-lines', 'reports', 'setup', 'help', counts.reports > 0 ? 'success' : 'neutral'),
      this.makeAction('Settings', 'Confirm account profile, units, goals, financial reporting, and staleness preferences.', 'Account setup', 'fa-gear', 'settings', 'profile', 'help', 'info'),
      this.makeAction('Imports / Backup', 'Use account-level import, backup, and restore paths.', 'Data intake', 'fa-upload', 'imports', 'template', 'help', 'neutral')
    ];
  }

  private getUtilitySummaries(): Array<P1AccountUtilitySummary> {
    const counts = this.counts();
    const basis = this.getDataBasis();
    if (counts.meters === 0 || counts.meterReadings === 0) {
      return [
        { label: 'Energy use', value: '--', unit: 'MMBtu', trend: 'Add meter readings', tone: 'danger' },
        { label: 'Utility cost', value: '--', unit: 'USD', trend: 'Costs unavailable', tone: 'warning' },
        { label: 'Water', value: '--', unit: 'kgal', trend: 'Water meters optional', tone: 'neutral' }
      ];
    }
    return [
      { label: 'Energy use', value: this.formatNumber(basis * 145), unit: 'MMBtu', trend: '-3.6% portfolio trend', tone: 'success' },
      { label: 'Utility cost', value: this.formatCurrency(basis * 1125), unit: 'USD', trend: '+1.8% rate pressure', tone: 'warning' },
      { label: 'Water', value: this.formatNumber(Math.max(0, basis * 24)), unit: 'kgal', trend: 'Estimated from data volume', tone: 'info' }
    ];
  }

  private getReadinessItems(): Array<P1AccountReadinessItem> {
    const actions = this.getLaunchpadActions();
    return [
      this.readinessItem('Facilities', this.getFacilitiesSummary(), actions[0], 'fa-industry'),
      this.readinessItem('Utility data', this.combineTaskSummary(['meters', 'meter-data', 'meter-groups']), actions[1], 'fa-gauge-high'),
      this.readinessItem('Predictors', this.combineTaskSummary(['predictors']), actions[2], 'fa-cloud-sun'),
      this.readinessItem('Account analysis', this.getAnalysisSummary(), actions[5], 'fa-microscope'),
      this.readinessItem('Reports', this.getReportSummary(), actions[6], 'fa-file-lines')
    ];
  }

  private getTrendChart(): P1OverviewChartConfig {
    const counts = this.counts();
    const hasData = counts.meterReadings > 0;
    const labels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const multiplier = hasData ? Math.max(8, this.getDataBasis() / Math.max(1, counts.facilities)) : 5;
    return {
      kind: 'trend',
      title: 'Monthly portfolio trend',
      subtitle: hasData ? 'Series shaped from current account data volume.' : 'Estimated trend shown until meter readings exist.',
      labels,
      unit: 'Indexed use',
      series: [
        { name: 'Energy', values: labels.map((_, index) => Math.round(multiplier * (10 + index * .35 + Math.sin(index / 1.4) * .7))), colorToken: '--prototype-green' },
        { name: 'Cost', values: labels.map((_, index) => Math.round(multiplier * (7 + index * .32 + Math.cos(index / 2) * .8))), colorToken: '--prototype-orange' },
        { name: 'Water', values: labels.map((_, index) => Math.round(multiplier * (4 + Math.sin(index / 1.7) * .7))), colorToken: '--prototype-blue' }
      ]
    };
  }

  private getContributionChart(): P1OverviewChartConfig {
    const facilities = this.facade.accountFacilities();
    const displayFacilities = facilities.slice(0, 6);
    const labels = displayFacilities.length > 0 ? displayFacilities.map(facility => facility.name) : ['No facilities'];
    const values = displayFacilities.length > 0
      ? displayFacilities.map((facility, index) => Math.max(1, facility.meterReadings || facility.meters * 12 || index + 1))
      : [0];
    return {
      kind: 'mix',
      title: 'Facility contribution',
      subtitle: facilities.length > 6 ? 'Top six facilities by available data volume.' : 'Facility comparison based on available data volume.',
      labels,
      unit: 'Data volume',
      series: [{
        name: 'Facilities',
        values,
        colorTokens: labels.map((_, index) => ['--prototype-blue', '--prototype-green', '--prototype-orange', '--prototype-accent'][index % 4])
      }]
    };
  }

  private getReadinessChart(): P1OverviewChartConfig {
    const tasks = this.setupTasks();
    return {
      kind: 'readiness',
      title: 'Setup readiness',
      subtitle: 'Current P1 setup task status across the active account.',
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

  private readinessItem(title: string, summary: string, action: P1AccountHomeAction, icon: string): P1AccountReadinessItem {
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

  private getFacilitiesSummary(): string {
    const count = this.counts().facilities;
    return count > 0
      ? `${count} ${count === 1 ? 'facility is' : 'facilities are'} available for account setup, data, analysis, and reporting.`
      : 'Create a facility before adding meters, predictors, analyses, and reports.';
  }

  private getAnalysisSummary(): string {
    const count = this.counts().analyses;
    if (count > 0) {
      return `${count} ${count === 1 ? 'analysis is' : 'analyses are'} available for review.`;
    }
    return this.counts().meterReadings > 0
      ? 'Create account analysis after facility-level data is ready.'
      : 'Add facility utility data before creating account analysis.';
  }

  private getReportSummary(): string {
    const count = this.counts().reports;
    if (count > 0) {
      return `${count} ${count === 1 ? 'report is' : 'reports are'} available.`;
    }
    return this.counts().analyses > 0
      ? 'Prepare report setup from available account and facility analyses.'
      : 'Create analyses before preparing account reports.';
  }

  private combineTaskSummary(keywords: Array<string>): string {
    const tasks = this.setupTasks().filter(task => keywords.some(keyword => task.id.includes(keyword)));
    if (tasks.length === 0) {
      return 'No matching setup task is available for this account.';
    }
    const blocked = tasks.find(task => task.status === 'blocked');
    const ready = tasks.find(task => task.status === 'ready');
    return (blocked || ready || tasks[0]).summary;
  }

  private toneFromSummary(summary: string): P1StatusTone {
    const lower = summary.toLowerCase();
    if (lower.includes('before') || lower.includes('create a facility')) {
      return 'danger';
    }
    if (lower.includes('add') || lower.includes('create') || lower.includes('prepare')) {
      return 'warning';
    }
    return 'success';
  }

  private getCounts(): P1AccountOverviewCounts {
    return {
      facilities: this.readMetric('home', 'Facilities'),
      meters: this.readMetric('data', 'Meters'),
      meterReadings: this.readMetric('data', 'Meter readings'),
      predictors: this.readMetric('data', 'Predictors'),
      analyses: this.readMetric('home', 'Analyses'),
      reports: this.readMetric('home', 'Reports')
    };
  }

  private readMetric(section: P1SectionId, label: string): number {
    const metric = this.facade.data().content.account[section].metrics.find(item => item.label === label);
    return this.parseNumber(metric?.value);
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
  ): P1AccountHomeAction {
    return { title, summary, meta, icon, section, detail, panelTab, tone };
  }

  private getDataBasis(): number {
    const counts = this.counts();
    return Math.max(counts.meterReadings, counts.meters * 12, counts.facilities * 6, 1);
  }

  private parseNumber(value: string | undefined): number {
    if (!value) {
      return 0;
    }
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
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

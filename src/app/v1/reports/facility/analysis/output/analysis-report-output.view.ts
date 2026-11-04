import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { FacilityAnalysisGroupCalculationResult } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { resultMarkerDetails } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';
import { annualResultChartsView, monthlyResultChartsView, facilityAnnualChartRows, facilityMonthlyChartRows, AnalysisResultChartsView } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { analysisModelComparisonChart } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.view';
import { contributionHeatmapOption } from '@app/v1/shared/analysis-results/contribution-heatmap/contribution-heatmap.view';
import { analysisResultChartOptions } from '@app/v1/shared/analysis-results/result-charts/analysis-result-chart-options';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { ChartSlide } from '@shared/report-output/ppt-slide';
import { analysisModelDetails } from '@app/v1/reports/shared/analysis-checks/analysis-model.view';
import { FacilityAnalysisDocument } from '../analysis-report-document';
import { analysisReportTable, FacilityAnalysisReportSection } from '../analysis-report.view';

export interface OutputHeader { readonly content: string; readonly span: number; }
export interface AnalysisOutputTable {
  readonly kind: 'table'; readonly title: string; readonly headers: readonly OutputHeader[];
  readonly subHeaders?: readonly string[]; readonly rows: readonly string[][]; readonly note?: string;
}
export interface AnalysisOutputFigure {
  readonly kind: 'figure'; readonly title: string; readonly option: V1EChartsOption; readonly native?: ChartSlide;
}
export type AnalysisOutputEntry = AnalysisOutputTable | AnalysisOutputFigure | { readonly kind: 'text'; readonly title?: string; readonly text: string };
export interface AnalysisOutputBlock { readonly title: string; readonly entries: readonly AnalysisOutputEntry[]; }

const number = new AnalysisResultNumberPipe();
const percent = (value: number | null | undefined, digits = 3) => value == null || !Number.isFinite(value) ? '—'
  : `${value.toLocaleString('en-US', { maximumFractionDigits: digits })}%`;

/** Format adapters share semantics; no calculation or mounted chart is consulted here. */
export function facilityAnalysisOutputBlocks(document: FacilityAnalysisDocument): readonly AnalysisOutputBlock[] {
  return document.sections.map(section => ({ title: section.heading, entries: sectionEntries(document, section) }));
}

function sectionEntries(doc: FacilityAnalysisDocument, section: FacilityAnalysisReportSection): AnalysisOutputEntry[] {
  const { settings, results } = doc;
  switch (section.kind) {
    case 'facility-annual': return [
      ...(settings.facilityAnnualResultsTable ? [resultTable(doc, 'Facility annual results', 'annual', results.annualAnalysisSummaries, [], undefined, false)] : []),
      ...(settings.facilityAnnualResultsGraphs ? resultFigures(doc, 'Facility', 'annual', results.annualAnalysisSummaries, [], undefined) : [])
    ];
    case 'facility-monthly': return [
      ...section.periods.map(period => resultTable(doc, period.label, 'monthly', [], period.rows, undefined, period.baseline)),
      ...(settings.facilityMonthlyResultsGraphs ? resultFigures(doc, 'Facility', 'monthly', [], results.monthlyAnalysisSummaryData, undefined) : [])
    ];
    case 'group-annual': return [
      ...(settings.groupAnnualResultsTable ? [resultTable(doc, 'Group annual results', 'annual', section.result.annualAnalysisSummaryData, [], section.result, false)] : []),
      ...(settings.groupAnnualResultsGraphs ? resultFigures(doc, section.heading, 'annual', section.result.annualAnalysisSummaryData, [], section.result) : [])
    ];
    case 'group-monthly': return [
      ...section.periods.map(period => resultTable(doc, period.label, 'monthly', [], period.rows, section.result, period.baseline)),
      ...(settings.groupMonthlyResultsGraphs ? resultFigures(doc, section.heading, 'monthly', [], section.result.monthlyAnalysisSummaryData, section.result) : [])
    ];
    case 'group-model': return modelEntries(doc, section);
    case 'facility-group-contributions': return contributionEntries(doc);
  }
}

function resultTable(doc: FacilityAnalysisDocument, title: string, period: 'annual' | 'monthly',
  annual: readonly AnnualAnalysisSummary[], monthly: readonly MonthlyAnalysisSummaryData[], group: FacilityAnalysisGroupCalculationResult | undefined, baseline: boolean): AnalysisOutputTable {
  const table = analysisReportTable(annual, monthly, doc.settings.analysisTableColumns, period, doc.unit, doc.facility,
    doc.analysis.hasBanking, group?.group, group ? [] : doc.results.groupSummaries, baseline);
  const groups: OutputHeader[] = [{ content: period === 'annual' ? 'Year' : 'Month', span: 1 }];
  for (const section of ['use', 'predictors', 'improvement'] as const) {
    const count = table.headers.filter(header => header.section === section).length;
    if (count) groups.push({ content: section === 'use' ? `Use (${doc.unit})` : section === 'predictors' ? 'Predictors' : 'Improvement', span: count });
  }
  const markers = table.markers.map(marker => resultMarkerDetails(marker).label);
  return {
    kind: 'table', title, headers: groups,
    subHeaders: ['', ...table.headers.map(header => `${header.label}${'unit' in header && header.unit ? ` (${header.unit})` : ''}`)],
    rows: table.rows.map(row => [row.label + (row.markers.length ? ` [${row.markers.map(marker => resultMarkerDetails(marker).label).join('; ')}]` : '') + (row.missing ? ' *' : ''),
      ...row.cells.map(cell => (cell.percent ? percent(cell.value, 2) : number.transform(cell.value)) + (cell.missing ? ' *' : ''))]),
    note: [...markers, ...(table.missing ? ['* Missing predictor data.'] : [])].join(' · ') || undefined
  };
}

function resultFigures(doc: FacilityAnalysisDocument, label: string, period: 'annual' | 'monthly', annual: readonly AnnualAnalysisSummary[],
  monthly: readonly MonthlyAnalysisSummaryData[], group?: FacilityAnalysisGroupCalculationResult): AnalysisOutputFigure[] {
  const view = period === 'annual'
    ? annualResultChartsView(group ? annual : facilityAnnualChartRows(annual, doc.results.groupSummaries), doc.analysis.analysisCategory, doc.unit)
    : monthlyResultChartsView(group ? monthly : facilityMonthlyChartRows(monthly, doc.results.groupSummaries), monthly,
      doc.analysis.analysisCategory, doc.unit, !!group && monthly.some(row => row.isBanked));
  const options = analysisResultChartOptions(view);
  const useTitle = `${label} — ${period} ${doc.analysis.analysisCategory === 'water' ? 'consumption' : 'energy use'}`;
  const improvementTitle = `${label} — ${period === 'annual' ? 'annual and total improvement' : 'monthly rolling savings'}`;
  return [
    { kind: 'figure', title: useTitle, option: options.use,
      native: period === 'annual' ? nativeChart(view, 'use', useTitle) : undefined },
    { kind: 'figure', title: improvementTitle, option: options.improvement, native: nativeChart(view, 'improvement', improvementTitle) }
  ];
}

export function nativeChart(view: AnalysisResultChartsView, figure: 'use' | 'improvement', title: string): ChartSlide | undefined {
  const rows = figure === 'use' ? view.useRows : view.improvementRows;
  const metrics = figure === 'use' ? view.useMetrics : view.improvementMetrics;
  if (!rows.length || rows.some(row => metrics.some(metric => !Number.isFinite(row.values[metric.id])))) return undefined;
  const monthly = view.period === 'monthly';
  return {
    type: 'chart', title, chartType: figure === 'use' || monthly ? 'bar' : 'line',
    labels: rows.map(row => row.periodLabel),
    series: metrics.map(metric => ({ name: metric.label, data: rows.map(row => row.values[metric.id] as number),
      color: metric.id.toLowerCase().includes('loss') ? 'B42318' : metric.id === 'savings' ? '18794E' : undefined })),
    barGrouping: monthly ? 'stacked' : 'clustered', yAxisUnit: figure === 'use' ? view.unit : '%',
    valAxisLabelFormatCode: figure === 'use' ? '#,##0' : '0.0"%"', showDataLabels: !monthly,
    valAxisMinVal: Math.min(0, ...rows.flatMap(row => metrics.map(metric => row.values[metric.id] as number)))
  };
}

function modelEntries(doc: FacilityAnalysisDocument, section: Extract<FacilityAnalysisReportSection, { kind: 'group-model' }>): AnalysisOutputEntry[] {
  const checked = section.checked, model = checked?.model;
  if (!checked || !model) return [{ kind: 'text', text: 'No regression model is available. Review Data Checks.' }];
  const details = analysisModelDetails(checked);
  const entries: AnalysisOutputEntry[] = [
    { kind: 'table', title: 'Regression model', headers: [
      'Model period', 'Variable p-values', 'R²', 'Adjusted R²', 'Model p-value', 'Formula', 'Minor issues'
    ].map(content => ({ content, span: 1 })), rows: [[details.modelPeriod,
      details.variablePValues.map(item => `${item.name}: ${item.value}`).join('\n') || '—',
      model.R2 == null ? '—' : model.R2.toFixed(3), model.adjust_R2 == null ? '—' : model.adjust_R2.toFixed(3),
      model.modelPValue == null ? '—' : model.modelPValue.toFixed(2), details.formula, model.modelNotes.join('\n') || '—']] },
    { kind: 'table', title: 'Predictor validation', headers: [{ content: 'Validation measure', span: 1 },
      ...model.SEPValidation.map(validation => ({ content: validation.predictorVariable, span: 1 }))],
      rows: [...details.validation.map(row => [row.label, ...row.cells.map(cell => `${number.transform(cell.value)}${cell.failed ? ' — Failed' : ''}`)]),
        ['Validation check', ...model.SEPValidation.map(validation => validation.isValid ? 'Pass' : 'Fail')]] }
  ];
  const option = analysisModelComparisonChart({ source: model.isUserDefinedModel ? 'user-defined' : 'generated',
    modelYear: model.modelYear ?? section.result.group.regressionModelYear, group: checked.group, category: doc.analysis.analysisCategory, unit: doc.unit,
    monthly: section.result.monthlyAnalysisSummaryData.map(row => ({ ...row, energyUse: Number.isFinite(row.energyUse) ? row.energyUse : null,
      modeledEnergy: row.isIntermediateBanked || !Number.isFinite(row.modeledEnergy) ? null : row.modeledEnergy })) });
  if (option) entries.push({ kind: 'figure', title: `${section.heading} — Model comparison`, option });
  return entries;
}

function contributionEntries(doc: FacilityAnalysisDocument): AnalysisOutputEntry[] {
  const view = doc.contributions;
  if (!view.groups.length || !view.years.length) return [{ kind: 'text', text: 'No group contribution results. Post-baseline results from at least one included group are needed.' }];
  const entries: AnalysisOutputEntry[] = [];
  if (doc.settings.facilityGroupContributionsTable !== false) entries.push({ kind: 'table', title: 'Group contributions',
    headers: [`Group / Fiscal Year`, `Savings (${doc.unit})`, '% Savings', '% Contribution'].map(content => ({ content, span: 1 })),
    rows: view.years.flatMap(year => [[`Fiscal Year ${year.year} Total`, number.transform(year.totalSavings), percent(year.totalSavingsPercent), percent(year.totalContributionPercent)],
      ...year.groups.map(group => [group.groupName, number.transform(group.savings), percent(group.savingsPercent), percent(group.contributionPercent)])]) });
  if (doc.settings.facilityGroupContributionsGraphs !== false) {
    const magnitude = Math.max(1, ...view.years.flatMap(year => year.groups.map(group => Math.abs(group.contributionPercent))));
    for (let row = 0; row < view.groups.length; row += 12) for (let column = 0; column < view.years.length; column += 8) {
      const option = contributionHeatmapOption({ labels: view.groups.slice(row, row + 12).map(group => group.groupName),
        years: view.years.slice(column, column + 8).map(year => ({ year: year.year, totalContributionPercent: year.totalContributionPercent,
          contributions: year.groups.slice(row, row + 12).map(group => group.contributionPercent) })) }, 'Group contribution', false, magnitude);
      entries.push({ kind: 'figure', title: `Group contributions${view.groups.length > 12 || view.years.length > 8 ? ` — groups ${row + 1}–${Math.min(row + 12, view.groups.length)}, years ${view.years[column].year}–${view.years[Math.min(column + 7, view.years.length - 1)].year}` : ''}`, option });
    }
  }
  return entries;
}

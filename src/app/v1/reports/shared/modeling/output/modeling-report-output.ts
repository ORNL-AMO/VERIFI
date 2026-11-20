import { ModelingReportView } from '@domain/reports/modeling-report';
import { ChartSection, ReportSection } from '@shared/report-output/report-section.model';
import { AnalysisModelComparisonData } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.view';
import { MODELING_REGRESSION_HEADERS, MODELING_DETAILS_HEADERS, modelingDetailsCells, modelingGroupTitle, modelingModelDetails, modelingRegressionCells, modelingValidationRows } from '../modeling-report-tables';

export type ModelingOutputChart = ChartSection & { readonly modelComparison: AnalysisModelComparisonData };
export type ModelingOutputSection = Exclude<ReportSection, ChartSection> | ModelingOutputChart;

/** Detached presentation data; future account adapters supply the same scope-neutral contract. */
export interface ModelingReportExportSnapshot {
  readonly identity: string;
  readonly name: string;
  readonly scopeName: string;
  readonly view: ModelingReportView;
}

/** Unnormalized presentation content shared by both file formats and delivery freshness. */
export function modelingReportSections(view: ModelingReportView): ModelingOutputSection[] {
  const sections: ModelingOutputSection[] = [];
  const heading = (title: string) => sections.push({ type: 'heading', title, pageBreakBefore: true,
    tocInclude: true, tocLabel: title });
  const notice = (text: string, explanation?: string, success = false) => sections.push({ type: 'styledText', content: [
    { text, bold: true, fontSize: 12, align: 'center', color: success ? [35, 105, 65] : [30, 90, 140], spaceAfter: 8 },
    ...(explanation ? [{ text: explanation, align: 'center' as const }] : [])
  ] });
  if (view.settings.includeIssuesSummary) {
    heading('Issues Summary');
    if (!view.groups.length) notice('No included analysis groups are available.', 'Review the linked analysis setup.');
    else if (!view.issues.some(severity => severity.rows.length)) notice('No issues identified.', undefined, true);
    for (const severity of view.issues) if (severity.rows.length) sections.push({ type: 'table', title: `${severity.label} issues`,
      headers: ['Facility', 'Group', 'Issue'], rows: severity.rows.map(row => [row.facilityName, row.groupName, row.note]) });
  }
  if (view.settings.includeExecutiveSummary) {
    heading('Executive Summary');
    if (view.regression.length) sections.push({ type: 'table', title: 'Analysis Type: Regression',
      headers: [...MODELING_REGRESSION_HEADERS], rows: view.regression.map(modelingRegressionCells) });
    for (const method of view.methods) {
      const predictors = method.method !== 'absoluteEnergyConsumption';
      sections.push({ type: 'table', title: `Analysis Type: ${method.label}`,
        headers: ['Facility', 'Group', 'Baseline year', ...(predictors ? ['Predictor variables'] : [])],
        rows: method.groups.map(group => [group.facilityName, group.groupName, String(group.baselineYear),
          ...(predictors ? [group.predictors.join('\n') || '—'] : [])]) });
    }
    if (!view.groups.length) notice('Executive summary is unavailable.');
  }
  if (view.settings.includeDataValidationTables) {
    heading('Model Details');
    for (const [index, group] of view.regression.entries()) {
      const title = modelingGroupTitle(view, group);
      sections.push({ type: 'styledText', pageBreakBefore: index > 0, tocInclude: true, tocLabel: title, bookmarkLevel: 1,
        content: [{ text: title, fontSize: 12, bold: true, align: 'center' }] });
      sections.push({ type: 'table', headers: view.scope === 'facility' ? MODELING_DETAILS_HEADERS.slice(2) : [...MODELING_DETAILS_HEADERS], rows: [modelingDetailsCells(group, view.scope)],
        equation: { label: group.chart?.category === 'water' ? 'Modeled Water' : 'Modeled Energy', expression: modelingModelDetails(group).formula } });
      if (group.chart?.monthly.length) sections.push({ type: 'chart', title: `${title} — Model comparison`,
        modelComparison: { ...group.chart, group: {
          regressionStartYear: group.group.regressionStartYear, regressionEndYear: group.group.regressionEndYear,
          regressionModelStartMonth: group.group.regressionModelStartMonth, regressionModelEndMonth: group.group.regressionModelEndMonth
        } } });
      else notice(group.chart?.message ?? 'No model comparison data is available.');
      if (group.model?.SEPValidation?.length) sections.push({ type: 'table',
        headers: ['Validation measure', ...group.model.SEPValidation.map(validation => validation.predictorVariable)],
        rows: modelingValidationRows(group) });
      else notice('Predictor validation is unavailable for this model.', 'Review the analysis setup.');
    }
    if (!view.regression.length) notice('No regression groups are included.', 'Model Details apply to regression groups.');
  }
  return sections;
}

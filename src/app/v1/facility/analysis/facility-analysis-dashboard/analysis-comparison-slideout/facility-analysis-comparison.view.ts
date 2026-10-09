import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/facility/data/meters/models';
import {
  AnalysisResultMarker,
  annualResultMarkers,
  orderedUniqueResultMarkers
} from '../../facility-analysis-workbench/results/presentation/result-markers/analysis-result-markers';
import { buildFacilityAnalysisGroupModelViews } from '../../group-model-roster/facility-analysis-group-model.view';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';

export interface FacilityAnalysisComparisonField {
  readonly id: string;
  readonly label: string;
  readonly firstValue: string;
  readonly secondValue: string;
  readonly different: boolean;
}

export interface FacilityAnalysisComparisonGroup {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly FacilityAnalysisComparisonField[];
  readonly different: boolean;
}

export interface FacilityAnalysisComparisonAnnualCell {
  readonly actual: number | null;
  readonly adjusted: number | null;
  readonly savings: number | null;
  readonly annualImprovement: number | null;
  readonly totalImprovement: number | null;
  readonly markers: readonly AnalysisResultMarker[];
  readonly incomplete: boolean;
}

export interface FacilityAnalysisComparisonAnnualRow {
  readonly year: number;
  readonly yearLabel: string;
  readonly first?: FacilityAnalysisComparisonAnnualCell;
  readonly second?: FacilityAnalysisComparisonAnnualCell;
}

export interface FacilityAnalysisComparisonView {
  readonly first: FacilityAnalysisDashboardCard;
  readonly second: FacilityAnalysisDashboardCard;
  readonly analysisFields: readonly FacilityAnalysisComparisonField[];
  readonly groups: readonly FacilityAnalysisComparisonGroup[];
  readonly annualRows: readonly FacilityAnalysisComparisonAnnualRow[];
  readonly annualMarkers: readonly AnalysisResultMarker[];
  readonly firstUnit: string;
  readonly secondUnit: string;
  readonly useChartCompatible: boolean;
  readonly useChartUnavailableMessage?: string;
  readonly useChartRows: readonly MeterResultsChartRow[];
  readonly useChartMetrics: readonly MeterResultsChartMetric[];
  readonly improvementChartRows: readonly MeterResultsChartRow[];
  readonly improvementChartMetrics: readonly MeterResultsChartMetric[];
  readonly firstResultMessage?: string;
  readonly secondResultMessage?: string;
}

export function buildFacilityAnalysisComparisonView(
  first: FacilityAnalysisDashboardCard,
  second: FacilityAnalysisDashboardCard,
  facility: Pick<IdbFacility, 'fiscalYear'>,
  meterGroups: readonly IdbUtilityMeterGroup[],
  analyses: readonly IdbAnalysisItem[]
): FacilityAnalysisComparisonView {
  const firstAnnual = readyAnnualRows(first);
  const secondAnnual = readyAnnualRows(second);
  const annualRows = buildAnnualRows(firstAnnual, secondAnnual, facility);
  const useChartCompatible = first.category === second.category
    && comparisonUnit(first) === comparisonUnit(second)
    && (first.category === 'water' || first.analysis.energyIsSource === second.analysis.energyIsSource);
  return {
    first,
    second,
    analysisFields: buildAnalysisFields(first, second, analyses),
    groups: buildGroupComparisons(first.analysis, second.analysis, meterGroups, analyses),
    annualRows,
    annualMarkers: orderedUniqueResultMarkers(annualRows.flatMap(row => [
      ...(row.first?.markers ?? []),
      ...(row.second?.markers ?? [])
    ])),
    firstUnit: comparisonUnit(first) || 'Not set',
    secondUnit: comparisonUnit(second) || 'Not set',
    useChartCompatible,
    useChartUnavailableMessage: useChartCompatible
      ? undefined
      : useChartCompatibilityMessage(first, second),
    useChartRows: buildChartRows(annualRows, 'use'),
    useChartMetrics: useChartMetrics(first, second),
    improvementChartRows: buildChartRows(annualRows, 'improvement'),
    improvementChartMetrics: improvementChartMetrics(first, second),
    firstResultMessage: resultMessage(first),
    secondResultMessage: resultMessage(second)
  };
}

function buildAnalysisFields(
  first: FacilityAnalysisDashboardCard,
  second: FacilityAnalysisDashboardCard,
  analyses: readonly IdbAnalysisItem[]
): readonly FacilityAnalysisComparisonField[] {
  return [
    comparisonField('status', 'Status', first.statusLabel, second.statusLabel),
    comparisonField('baseline', 'Baseline year', yearValue(first.analysis.baselineYear), yearValue(second.analysis.baselineYear)),
    comparisonField('category', 'Category', categoryLabel(first), categoryLabel(second)),
    comparisonField('unit', 'Unit', comparisonUnit(first) || 'Not set', comparisonUnit(second) || 'Not set'),
    comparisonField('basis', 'Basis', basisLabel(first), basisLabel(second)),
    comparisonField('banking', 'Banking source', bankingSourceLabel(first.analysis, analyses), bankingSourceLabel(second.analysis, analyses))
  ];
}

function buildGroupComparisons(
  first: IdbAnalysisItem,
  second: IdbAnalysisItem,
  meterGroups: readonly IdbUtilityMeterGroup[],
  analyses: readonly IdbAnalysisItem[]
): readonly FacilityAnalysisComparisonGroup[] {
  const firstGroups = new Map((first.groups ?? []).map(group => [group.idbGroupId, group]));
  const secondGroups = new Map((second.groups ?? []).map(group => [group.idbGroupId, group]));
  const firstModels = new Map(buildFacilityAnalysisGroupModelViews(first, meterGroups).map(group => [group.id, group]));
  const secondModels = new Map(buildFacilityAnalysisGroupModelViews(second, meterGroups).map(group => [group.id, group]));
  const names = new Map(meterGroups.map(group => [group.guid, group.name || 'Untitled group']));
  const configuredIds = new Set([...firstGroups.keys(), ...secondGroups.keys()]);
  const orderedIds = [
    ...meterGroups.map(group => group.guid).filter(guid => configuredIds.has(guid)),
    ...[...configuredIds]
      .filter(guid => !names.has(guid))
      .sort((left, right) => left.localeCompare(right))
  ];

  return orderedIds.map((id, index) => {
    const firstGroup = firstGroups.get(id);
    const secondGroup = secondGroups.get(id);
    const firstModel = firstModels.get(id);
    const secondModel = secondModels.get(id);
    const fields = [
      comparisonField('inclusion', 'Participation', participationLabel(firstGroup), participationLabel(secondGroup)),
      comparisonField('method', 'Analysis method', firstModel?.methodLabel ?? 'Not configured', secondModel?.methodLabel ?? 'Not configured'),
      comparisonField('predictors', 'Selected predictors', predictorLabel(firstGroup), predictorLabel(secondGroup)),
      comparisonField('model', 'Model context', firstModel?.modelLabel ?? 'Not configured', secondModel?.modelLabel ?? 'Not configured'),
      comparisonField('equation', 'Modeled equation', firstModel?.equationLabel ?? 'Not configured', secondModel?.equationLabel ?? 'Not configured'),
      comparisonField('baseload', 'Legacy baseload', baseloadLabel(firstGroup), baseloadLabel(secondGroup)),
      comparisonField('banking', 'Banking setup', groupBankingLabel(first, firstGroup, analyses), groupBankingLabel(second, secondGroup, analyses))
    ];
    return {
      id,
      name: names.get(id) || firstModel?.name || secondModel?.name || `Meter group ${index + 1}`,
      fields,
      different: fields.some(field => field.different)
    };
  });
}

function buildAnnualRows(
  firstRows: readonly AnnualAnalysisSummary[],
  secondRows: readonly AnnualAnalysisSummary[],
  facility: Pick<IdbFacility, 'fiscalYear'>
): readonly FacilityAnalysisComparisonAnnualRow[] {
  const firstByYear = new Map(firstRows.map(row => [row.year, row]));
  const secondByYear = new Map(secondRows.map(row => [row.year, row]));
  const years = [...new Set([...firstByYear.keys(), ...secondByYear.keys()])]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  return years.map(year => ({
    year,
    yearLabel: facility.fiscalYear === 'calendarYear' ? String(year) : `FY ${year}`,
    first: annualCell(firstByYear.get(year)),
    second: annualCell(secondByYear.get(year))
  }));
}

function annualCell(row: AnnualAnalysisSummary | undefined): FacilityAnalysisComparisonAnnualCell | undefined {
  if (!row) return undefined;
  const transition = row.isIntermediateBanked === true;
  return {
    actual: finiteValue(row.energyUse),
    adjusted: transition ? null : finiteValue(row.adjusted),
    savings: transition ? null : finiteValue(row.savings),
    annualImprovement: transition ? null : finiteValue(row.annualSavingsPercentImprovement),
    totalImprovement: finiteValue(row.totalSavingsPercentImprovement),
    markers: annualResultMarkers(row),
    incomplete: row.missingPredictorValue === true
  };
}

function buildChartRows(
  rows: readonly FacilityAnalysisComparisonAnnualRow[],
  kind: 'use' | 'improvement'
): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: row.yearLabel,
    sortValue: row.year,
    values: kind === 'use'
      ? {
          firstActual: row.first?.actual ?? null,
          firstAdjusted: row.first?.adjusted ?? null,
          secondActual: row.second?.actual ?? null,
          secondAdjusted: row.second?.adjusted ?? null
        }
      : {
          firstAnnualImprovement: row.first?.annualImprovement ?? null,
          firstTotalImprovement: row.first?.totalImprovement ?? null,
          secondAnnualImprovement: row.second?.annualImprovement ?? null,
          secondTotalImprovement: row.second?.totalImprovement ?? null
        }
  }));
}

function useChartMetrics(
  first: FacilityAnalysisDashboardCard,
  second: FacilityAnalysisDashboardCard
): readonly MeterResultsChartMetric[] {
  const unit = comparisonUnit(first);
  return [
    { id: 'firstActual', label: `${first.analysis.name} actual`, unit, color: 'var(--v1-chart-series-1)' },
    { id: 'firstAdjusted', label: `${first.analysis.name} adjusted`, unit, color: 'var(--v1-chart-series-2)' },
    { id: 'secondActual', label: `${second.analysis.name} actual`, unit, color: 'var(--v1-chart-series-3)' },
    { id: 'secondAdjusted', label: `${second.analysis.name} adjusted`, unit, color: 'var(--v1-chart-series-4)' }
  ];
}

function improvementChartMetrics(
  first: FacilityAnalysisDashboardCard,
  second: FacilityAnalysisDashboardCard
): readonly MeterResultsChartMetric[] {
  return [
    { id: 'firstAnnualImprovement', label: `${first.analysis.name} annual improvement`, unit: '%', color: 'var(--v1-chart-series-1)' },
    { id: 'firstTotalImprovement', label: `${first.analysis.name} total improvement`, unit: '%', color: 'var(--v1-chart-series-2)' },
    { id: 'secondAnnualImprovement', label: `${second.analysis.name} annual improvement`, unit: '%', color: 'var(--v1-chart-series-3)' },
    { id: 'secondTotalImprovement', label: `${second.analysis.name} total improvement`, unit: '%', color: 'var(--v1-chart-series-4)' }
  ];
}

function comparisonField(id: string, label: string, firstValue: string, secondValue: string): FacilityAnalysisComparisonField {
  return {
    id,
    label,
    firstValue,
    secondValue,
    different: normalize(firstValue) !== normalize(secondValue)
  };
}

function participationLabel(group: AnalysisGroup | undefined): string {
  if (!group) return 'Not configured';
  if (group.analysisType === 'skip') return 'Excluded';
  if (group.analysisType === 'skipAnalysis') return 'Tracked without savings';
  return 'Included';
}

function predictorLabel(group: AnalysisGroup | undefined): string {
  if (!group) return 'Not configured';
  const model = group.isGeneratedModel
    ? group.models?.find(item => item.modelId === group.selectedModelId)
    : undefined;
  const predictors = (model?.predictorVariables ?? group.predictorVariables ?? [])
    .filter(variable => model ? true : variable.productionInAnalysis)
    .map(variable => variable.name)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return predictors.length ? predictors.join(', ') : 'None';
}

function baseloadLabel(group: AnalysisGroup | undefined): string {
  if (!group) return 'Not configured';
  if (group.analysisType !== 'modifiedEnergyIntensity') return 'Not applicable';
  if (group.specifiedMonthlyPercentBaseload) return 'Monthly percentages';
  return Number.isFinite(group.averagePercentBaseload)
    ? `${group.averagePercentBaseload}% average`
    : 'Average not configured';
}

function groupBankingLabel(
  analysis: IdbAnalysisItem,
  group: AnalysisGroup | undefined,
  analyses: readonly IdbAnalysisItem[]
): string {
  if (!group) return 'Not configured';
  if (!analysis.hasBanking || !group.applyBanking) return 'Not applied';
  const source = analyses.find(item => item.guid === analysis.bankedAnalysisItemId)?.name || 'Unknown source';
  const applied = yearValue(group.bankedAnalysisYear);
  const baseline = yearValue(group.newBaselineYear);
  return `${source} · Applied ${applied} · New baseline ${baseline}`;
}

function bankingSourceLabel(analysis: IdbAnalysisItem, analyses: readonly IdbAnalysisItem[]): string {
  if (!analysis.hasBanking) return 'Disabled';
  const source = analyses.find(item => item.guid === analysis.bankedAnalysisItemId)?.name;
  return source ? `Enabled · ${source}` : 'Enabled · Source not set';
}

function categoryLabel(card: FacilityAnalysisDashboardCard): string {
  return card.category === 'water' ? 'Water' : 'Energy';
}

function comparisonUnit(card: FacilityAnalysisDashboardCard): string {
  return card.category === 'water' ? card.analysis.waterUnit : card.analysis.energyUnit;
}

function basisLabel(card: FacilityAnalysisDashboardCard): string {
  if (card.category === 'water') return 'Water';
  return card.analysis.energyIsSource ? 'Source energy' : 'Site energy';
}

function useChartCompatibilityMessage(
  first: FacilityAnalysisDashboardCard,
  second: FacilityAnalysisDashboardCard
): string {
  const reasons: string[] = [];
  if (first.category !== second.category) reasons.push('different categories');
  if (comparisonUnit(first) !== comparisonUnit(second)) reasons.push('different units');
  if (first.category === 'energy' && first.analysis.energyIsSource !== second.analysis.energyIsSource) {
    reasons.push('different site/source bases');
  }
  return `Actual and adjusted use cannot share one chart because these analyses use ${reasons.join(' and ')}. Their percentage-improvement results remain comparable.`;
}

function readyAnnualRows(card: FacilityAnalysisDashboardCard): readonly AnnualAnalysisSummary[] {
  return card.outcome.state === 'ready' ? card.outcome.annualAnalysisSummaries : [];
}

function resultMessage(card: FacilityAnalysisDashboardCard): string | undefined {
  if (card.outcome.state !== 'ready') return card.outcome.message;
  return card.outcome.annualAnalysisSummaries.length ? undefined : 'No complete annual results';
}

function finiteValue(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function yearValue(value: number): string {
  return Number.isFinite(value) ? String(value) : 'Not set';
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

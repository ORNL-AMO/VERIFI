import { AnalysisCategory, AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { formatRegressionNumber } from '@app/v1/facility/analysis/regression-number-format';

export interface FacilityAnalysisGroupModelView {
  readonly id: string;
  readonly name: string;
  readonly methodLabel: string;
  readonly modelLabel: string;
  readonly equationLabel: string;
  readonly unavailable: boolean;
  readonly excluded: boolean;
}

export function buildFacilityAnalysisGroupModelViews(
  analysis: IdbAnalysisItem,
  meterGroups: readonly IdbUtilityMeterGroup[]
): readonly FacilityAnalysisGroupModelView[] {
  const groupNames = new Map(meterGroups.map(group => [group.guid, group.name || 'Untitled group']));
  return (analysis.groups ?? []).map((group, index) => buildFacilityAnalysisGroupModelView(
    group,
    groupNames.get(group.idbGroupId) || `Meter group ${index + 1}`,
    analysis.analysisCategory,
    analysis.baselineYear
  ));
}

export function buildFacilityAnalysisGroupModelView(
  group: AnalysisGroup,
  name: string,
  category: AnalysisCategory,
  baselineYear: number
): FacilityAnalysisGroupModelView {
  const quantity = category === 'water' ? 'Modeled water' : 'Modeled energy';
  const production = productionExpression(group);
  switch (group.analysisType) {
    case 'regression': {
      const model = group.models?.find(item => item.modelId === group.selectedModelId);
      const groupVariables = (group.predictorVariables ?? []).filter(item => item.productionInAnalysis);
      const variables = group.isGeneratedModel ? model?.predictorVariables ?? [] : groupVariables;
      const coefficients = group.isGeneratedModel
        ? model?.coef?.slice(1) ?? []
        : variables.map(item => item.regressionCoefficient);
      const constant = group.isGeneratedModel ? model?.coef?.[0] : group.regressionConstant;
      const complete = Number.isFinite(constant)
        && variables.length > 0
        && variables.every((_, index) => Number.isFinite(coefficients[index]));
      const modelYear = group.isGeneratedModel ? model?.modelYear : group.regressionModelYear;
      return {
        id: group.idbGroupId,
        name,
        methodLabel: 'Regression',
        modelLabel: regressionModelLabel(group, modelYear),
        equationLabel: complete
          ? `${quantity} = ${formatRegressionNumber(constant, '—')}${variables.map((variable, index) =>
            regressionTerm(coefficients[index], variable.name)).join('')}`
          : 'Equation unavailable — complete and select a regression model.',
        unavailable: !complete,
        excluded: false
      };
    }
    case 'energyIntensity':
      return {
        id: group.idbGroupId,
        name,
        methodLabel: 'Classic intensity',
        modelLabel: `Baseline ${baselineYear}`,
        equationLabel: `${quantity} = baseline intensity × ${production}`,
        unavailable: false,
        excluded: false
      };
    case 'modifiedEnergyIntensity': {
      const baseload = group.specifiedMonthlyPercentBaseload
        ? 'monthly baseload share'
        : Number.isFinite(group.averagePercentBaseload)
          ? `${formatRegressionNumber(group.averagePercentBaseload, '—')}% baseload share`
          : 'configured baseload share';
      return {
        id: group.idbGroupId,
        name,
        methodLabel: 'Modified intensity',
        modelLabel: `Baseline ${baselineYear} · ${baseload}`,
        equationLabel: `${quantity} = baseline intensity × ${production} × (1 − baseload share) + baseline-period actual × baseload share`,
        unavailable: false,
        excluded: false
      };
    }
    case 'absoluteEnergyConsumption':
      return {
        id: group.idbGroupId,
        name,
        methodLabel: 'Absolute consumption',
        modelLabel: `Baseline ${baselineYear}`,
        equationLabel: `${quantity} = baseline-period actual consumption`,
        unavailable: false,
        excluded: false
      };
    case 'skip':
    case 'skipAnalysis':
      return {
        id: group.idbGroupId,
        name,
        methodLabel: 'Excluded',
        modelLabel: 'Not included in facility results',
        equationLabel: 'No modeled equation is applied.',
        unavailable: false,
        excluded: true
      };
  }
}

function regressionModelLabel(group: AnalysisGroup, modelYear: number | undefined): string {
  if (group.isGeneratedModel) {
    return Number.isFinite(modelYear) ? `Model year ${modelYear}` : 'Model year not set';
  }
  return Number.isFinite(modelYear)
    ? `User-defined model · Model year ${modelYear}`
    : 'User-defined model · Model year not set';
}

function productionExpression(group: AnalysisGroup): string {
  const names = (group.predictorVariables ?? [])
    .filter(variable => variable.productionInAnalysis)
    .map(variable => variable.name)
    .filter(Boolean);
  if (!names.length) return 'production';
  return names.length === 1 ? names[0] : `(${names.join(' + ')})`;
}

function regressionTerm(value: number | undefined, variableName: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ` + — × ${variableName}`;
  const sign = value < 0 ? ' − ' : ' + ';
  return `${sign}${formatRegressionNumber(Math.abs(value), '—')} × ${variableName}`;
}

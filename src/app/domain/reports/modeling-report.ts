import { ModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { AnalysisDataChecks } from './analysis-data-checks';
import { CheckedAnalysisReportInputs } from './analysis-report-inputs';
import { analysisReviewContent } from './analysis-review-inputs';
import { getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';

export interface ModelingReportChart {
  readonly key: string;
  readonly category: 'energy' | 'water';
  readonly unit: string;
  readonly source: 'generated' | 'user-defined';
  readonly modelYear: number | undefined;
  readonly throughYear?: number;
  readonly monthly: readonly { readonly date: Date; readonly fiscalYear: number;
    readonly energyUse: number | null; readonly modeledEnergy: number | null }[];
  readonly message?: string;
}
export interface ModelingReportChecks extends AnalysisDataChecks { readonly charts?: readonly ModelingReportChart[]; }
export function modelingGroupKey(item: AnalysisDataChecks['groups'][number]): string {
  return JSON.stringify([item.facilityGuid, item.analysisGuid, item.group.idbGroupId]);
}

/** Predictor names occur inside validation messages, so refresh them before checking. */
export function prepareModelingReportInputs(inputs: CheckedAnalysisReportInputs): CheckedAnalysisReportInputs {
  const detached = structuredClone(inputs), names = new Map(detached.predictors.map(item => [item.guid, item.name]));
  for (const analysis of detached.facilityAnalyses) for (const group of analysis.groups) {
    const original = group.predictorVariables ?? [];
    const model = getSelectedRegressionModel(group);
    for (const variable of model?.predictorVariables ?? []) {
      const id = names.has(variable.id) ? variable.id : original.find(candidate => candidate.name === variable.name)?.id;
      variable.name = names.get(id) ?? variable.name;
    }
    group.predictorVariables = original.map(variable => ({ ...variable, name: names.get(variable.id) ?? variable.name }));
  }
  return detached;
}

export function modelingReportContent(inputs: CheckedAnalysisReportInputs, reportYear: number): string {
  // Facility/group names remain presentation-only. Predictor names also shape diagnostic text.
  return JSON.stringify([analysisReviewContent(inputs, reportYear),
    inputs.facilityAnalyses.flatMap(analysis => analysis.groups).filter(group => !['skip', 'skipAnalysis'].includes(group.analysisType))
      .flatMap(group => [...(group.predictorVariables ?? []), ...(getSelectedRegressionModel(group)?.predictorVariables ?? [])])
      .map(variable => [variable.id, variable.name])]);
}

/** Scope-neutral content shared by facility and account Modeling reports. */
export function buildModelingReport(checks: ModelingReportChecks, settings: Pick<ModelingReportSettings,
  'includeIssuesSummary' | 'includeExecutiveSummary' | 'includeDataValidationTables'>,
  names: { readonly facilities: Readonly<Record<string, string>>; readonly groups: Readonly<Record<string, string>>;
    readonly predictors?: Readonly<Record<string, string>> }, scope: 'facility' | 'account' = 'account') {
  const predictorName = (variable: { readonly id: string; readonly name: string }) => names.predictors?.[variable.id] ?? variable.name;
  const groups = checks.groups.map(item => ({ ...item,
    model: item.model ? { ...item.model, predictorVariables: item.model.predictorVariables?.map(variable => ({ ...variable, name: predictorName(variable) })) } : undefined,
    key: modelingGroupKey(item),
    chart: checks.charts?.find(chart => chart.key === modelingGroupKey(item)),
    facilityName: names.facilities[item.facilityGuid] ?? item.facilityName,
    groupName: names.groups[item.group.idbGroupId] ?? 'Analysis group',
    predictors: (item.group.predictorVariables ?? []).filter(variable => variable.productionInAnalysis).map(predictorName)
  }));
  return { scope, reportYear: checks.reportYear, settings, groups,
    regression: groups.filter(item => item.group.analysisType === 'regression'),
    methods: (['energyIntensity', 'modifiedEnergyIntensity', 'absoluteEnergyConsumption'] as const).map(method => ({
      method, label: { energyIntensity: 'Classic Intensity', modifiedEnergyIntensity: 'Modified Intensity', absoluteEnergyConsumption: 'Absolute Consumption' }[method],
      groups: groups.filter(item => item.group.analysisType === method)
    })).filter(method => method.groups.length),
    issues: (['critical', 'moderate', 'minor'] as const).map(severity => ({ severity,
      label: { critical: 'Critical', moderate: 'Moderate', minor: 'Minor' }[severity],
      rows: groups.flatMap(group => group[severity].map(note => ({ key: group.key, facilityName: group.facilityName, groupName: group.groupName, note })))
    })),
    hasContent: settings.includeIssuesSummary || settings.includeExecutiveSummary || settings.includeDataValidationTables
  };
}
export type ModelingReportView = ReturnType<typeof buildModelingReport>;

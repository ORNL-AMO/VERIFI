import { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';

export type FacilitySelectionState = 'unconfigured' | 'error' | 'warning' | 'ready' | 'skipped';
export type FacilityAnalysisCandidateState = 'evaluating' | 'error' | 'warning' | 'ready';

export interface FacilityAnalysisStatusBadge {
  readonly label: string;
  readonly severity: 'error' | 'warning';
}

export interface FacilityAnalysisGroupSummary {
  readonly groupId: string;
  readonly groupName: string;
  readonly analysisLabel: string;
}

export interface FacilityAnalysisCandidate {
  readonly analysis: IdbAnalysisItem;
  readonly state: FacilityAnalysisCandidateState;
  readonly badges: readonly FacilityAnalysisStatusBadge[];
  readonly findings: readonly StatusItem[];
  readonly groups: readonly FacilityAnalysisGroupSummary[];
  readonly dataThrough?: Date;
}

export interface AccountAnalysisFacilitySelectionItem {
  readonly facility: IdbFacility;
  readonly analysisItemId?: string;
  readonly selectedAnalysis?: IdbAnalysisItem;
  readonly eligible: boolean;
  readonly assigned: boolean;
  readonly state: FacilitySelectionState;
}

export interface FacilityAnalysisDataInputs {
  readonly meterGroups: readonly IdbUtilityMeterGroup[];
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly predictorData: readonly IdbPredictorData[];
}

export function reconcileFacilityAnalysisLinks(
  analysis: Pick<IdbAccountAnalysisItem, 'facilityAnalysisItems'>,
  facilities: readonly IdbFacility[]
): IdbAccountAnalysisItem['facilityAnalysisItems'] {
  const existingByFacility = new Map(
    (analysis.facilityAnalysisItems ?? []).map(item => [item.facilityId, item.analysisItemId])
  );
  return facilities.map(facility => ({
    facilityId: facility.guid,
    analysisItemId: existingByFacility.get(facility.guid)
  }));
}

export function facilityAnalysisEligible(
  analysis: IdbAnalysisItem,
  accountAnalysis: Pick<IdbAccountAnalysisItem, 'analysisCategory' | 'energyIsSource' | 'baselineYear'>,
  facility: Pick<IdbFacility, 'guid' | 'isNewFacility'>
): boolean {
  if (analysis.facilityId !== facility.guid || analysis.analysisCategory !== accountAnalysis.analysisCategory) return false;
  if (analysis.analysisCategory === 'energy' && analysis.energyIsSource !== accountAnalysis.energyIsSource) return false;
  return !!facility.isNewFacility || analysis.baselineYear === accountAnalysis.baselineYear;
}

export function eligibleFacilityAnalysisCandidates(
  analyses: readonly IdbAnalysisItem[],
  accountAnalysis: IdbAccountAnalysisItem,
  facility: IdbFacility,
  findings: readonly StatusItem[],
  statusState: StatusEvaluationState,
  inputs: FacilityAnalysisDataInputs
): readonly FacilityAnalysisCandidate[] {
  return analyses
    .filter(analysis => facilityAnalysisEligible(analysis, accountAnalysis, facility))
    .sort((first, second) => dateValue(second.modifiedDate) - dateValue(first.modifiedDate))
    .map(analysis => buildFacilityAnalysisCandidate(analysis, findings, statusState, inputs));
}

export function buildFacilityAnalysisCandidate(
  analysis: IdbAnalysisItem,
  findings: readonly StatusItem[],
  statusState: StatusEvaluationState,
  inputs: FacilityAnalysisDataInputs
): FacilityAnalysisCandidate {
  const analysisFindings = findingsForFacilityAnalysis(analysis, findings);
  const badges = facilityAnalysisStatusBadges(analysisFindings);
  return {
    analysis,
    state: statusState === 'error'
      ? 'error'
      : statusState !== 'ready'
        ? 'evaluating'
        : badges.some(badge => badge.severity === 'error')
          ? 'error'
          : badges.length
            ? 'warning'
            : 'ready',
    badges,
    findings: analysisFindings,
    groups: analysis.groups.map(group => ({
      groupId: group.idbGroupId,
      groupName: inputs.meterGroups.find(item => item.guid === group.idbGroupId)?.name || 'Unknown group',
      analysisLabel: analysisTypeLabel(group.analysisType)
    })),
    dataThrough: facilityAnalysisDataThrough(analysis, inputs)
  };
}

export function buildFacilitySelectionItems(
  accountAnalysis: IdbAccountAnalysisItem,
  facilities: readonly IdbFacility[],
  analyses: readonly IdbAnalysisItem[],
  findings: readonly StatusItem[],
  statusState: StatusEvaluationState
): readonly AccountAnalysisFacilitySelectionItem[] {
  const links = reconcileFacilityAnalysisLinks(accountAnalysis, facilities);
  return facilities.map((facility, index) => {
    const analysisItemId = links[index].analysisItemId;
    if (analysisItemId === 'skip') {
      return { facility, analysisItemId, eligible: true, assigned: true, state: 'skipped' };
    }
    const selectedAnalysis = analyses.find(analysis => analysis.guid === analysisItemId && analysis.facilityId === facility.guid);
    const eligible = !!selectedAnalysis && facilityAnalysisEligible(selectedAnalysis, accountAnalysis, facility);
    if (!selectedAnalysis || !eligible) {
      return { facility, analysisItemId, selectedAnalysis, eligible, assigned: false, state: 'unconfigured' };
    }
    const relatedFindings = findingsForFacilityAnalysis(selectedAnalysis, findings);
    const hasError = relatedFindings.some(item => item.severity === 'error');
    const hasWarning = relatedFindings.some(item => item.severity === 'warning');
    return {
      facility,
      analysisItemId,
      selectedAnalysis,
      eligible,
      assigned: true,
      state: statusState === 'ready' && hasError
        ? 'error'
        : statusState === 'ready' && hasWarning
          ? 'warning'
          : statusState === 'ready'
            ? 'ready'
            : 'warning'
    };
  });
}

export function findingsForFacilityAnalysis(
  analysis: IdbAnalysisItem,
  findings: readonly StatusItem[]
): readonly StatusItem[] {
  const groupIds = new Set(analysis.groups.map(group => `${analysis.guid}:${group.idbGroupId}`));
  return findings.filter(item => item.entity.guid === analysis.guid
    || (item.entity.kind === 'analysis-group'
      && item.entity.facilityGuid === analysis.facilityId
      && groupIds.has(item.entity.guid)));
}

export function facilityAnalysisStatusBadges(
  findings: readonly StatusItem[]
): readonly FacilityAnalysisStatusBadge[] {
  const badges = new Map<string, FacilityAnalysisStatusBadge>();
  for (const finding of findings) {
    const badge = finding.code === 'analysis.configuration.invalid'
      ? { label: 'Setup Errors', severity: 'error' as const }
      : finding.code === 'analysis-group.setup.invalid'
        ? { label: 'Analysis Errors', severity: 'error' as const }
        : finding.code === 'analysis-group.model.invalid'
          ? { label: 'Model Warnings', severity: 'warning' as const }
          : finding.code === 'analysis-group.inputs.invalid'
            ? { label: 'Input Warnings', severity: 'warning' as const }
            : undefined;
    if (badge) badges.set(badge.label, badge);
  }
  return [...badges.values()];
}

export function analysisTypeLabel(type: AnalysisType): string {
  switch (type) {
    case 'absoluteEnergyConsumption': return 'Absolute';
    case 'energyIntensity': return 'Intensity';
    case 'modifiedEnergyIntensity': return 'Modified Intensity';
    case 'regression': return 'Regression';
    case 'skip': return 'Exclude';
    case 'skipAnalysis': return 'Skip All';
  }
}

export function facilityAnalysisDataThrough(
  analysis: IdbAnalysisItem,
  inputs: FacilityAnalysisDataInputs
): Date | undefined {
  const meterIds = new Set<string>();
  const predictorIds = new Set<string>();
  for (const group of analysis.groups) {
    if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') continue;
    inputs.meters
      .filter(meter => meter.facilityId === analysis.facilityId
        && meter.groupId === group.idbGroupId
        && !meter.noLongerInUse)
      .forEach(meter => meterIds.add(meter.guid));
    predictorIdsForGroup(group).forEach(id => predictorIds.add(id));
  }

  const latestDates = [
    ...[...meterIds].map(id => latestMonth(inputs.meterData.filter(item => item.meterId === id))),
    ...[...predictorIds].map(id => latestMonth(inputs.predictorData.filter(item => item.predictorId === id)))
  ];
  if (!latestDates.length || latestDates.some(date => !date)) return undefined;
  return new Date(Math.min(...latestDates.map(date => date!.getTime())));
}

export function facilityAnalysisBaselineForAccount(
  accountAnalysis: Pick<IdbAccountAnalysisItem, 'analysisCategory' | 'baselineYear'>,
  facility: Pick<IdbFacility, 'isNewFacility' | 'sustainabilityQuestions'>
): number {
  const facilityBaseline = accountAnalysis.analysisCategory === 'water'
    ? facility.sustainabilityQuestions.waterReductionBaselineYear
    : facility.sustainabilityQuestions.energyReductionBaselineYear;
  return facility.isNewFacility
    && Number.isFinite(facilityBaseline)
    && facilityBaseline > accountAnalysis.baselineYear
      ? facilityBaseline
      : accountAnalysis.baselineYear;
}

function predictorIdsForGroup(group: AnalysisGroup): readonly string[] {
  if (group.analysisType === 'energyIntensity' || group.analysisType === 'modifiedEnergyIntensity') {
    return group.predictorVariables.filter(item => item.productionInAnalysis && item.id).map(item => item.id);
  }
  if (group.analysisType !== 'regression') return [];
  if (group.isGeneratedModel) {
    return group.models?.find(model => model.modelId === group.selectedModelId)?.predictorVariables
      .filter(item => !!item.id)
      .map(item => item.id) ?? [];
  }
  return group.predictorVariables.filter(item => item.productionInAnalysis && item.id).map(item => item.id);
}

function latestMonth(items: readonly { year: number; month: number }[]): Date | undefined {
  const values = items
    .filter(item => Number.isFinite(item.year) && Number.isFinite(item.month) && item.month >= 1 && item.month <= 12)
    .map(item => new Date(item.year, item.month - 1, 1));
  return values.length ? new Date(Math.max(...values.map(date => date.getTime()))) : undefined;
}

function dateValue(value: Date | string | undefined): number {
  const date = value ? new Date(value).getTime() : 0;
  return Number.isFinite(date) ? date : 0;
}

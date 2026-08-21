import { AnalysisCategory, AnalysisGroup, AnalysisType, JStatRegressionModel } from '@data/models/analysis';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { AnalysisGroupStatusCheck } from '@domain/calculations/status-check-calculations/analysisGroupStatusCheck';
import { AnalysisStatusCheck } from '@domain/calculations/status-check-calculations/analysisStatusCheck';
import { P1StatusTone } from '../../p1.models';

export type P1FacilityAnalysisStepId =
  | 'setup'
  | 'group-setup'
  | 'regression'
  | 'group-annual'
  | 'group-monthly'
  | 'facility-annual'
  | 'facility-monthly'
  | 'references';

export interface P1FacilityAnalysisRow {
  analysis: IdbAnalysisItem;
  status?: AnalysisStatusCheck;
  tone: P1StatusTone;
  linkedAccountAnalyses: IdbAccountAnalysisItem[];
  linkedReports: IdbFacilityReport[];
  linkedBankingAnalyses: IdbAnalysisItem[];
  isBankedByAnotherAnalysis: boolean;
  isActiveForReporting: boolean;
  groupCount: number;
  regressionCount: number;
  modifiedDate: string;
}

export interface P1FacilityAnalysisStep {
  id: P1FacilityAnalysisStepId;
  label: string;
  groupId?: string;
  tone: P1StatusTone;
  disabled?: boolean;
}

export function buildP1FacilityAnalysisRows(
  analyses: IdbAnalysisItem[],
  statuses: AnalysisStatusCheck[],
  accountAnalyses: IdbAccountAnalysisItem[],
  reports: IdbFacilityReport[],
  facility?: IdbFacility
): P1FacilityAnalysisRow[] {
  return analyses
    .map(analysis => {
      const status = statuses.find(check => check.analysisItem.guid === analysis.guid);
      const linkedReports = reports.filter(report => report.analysisItemId === analysis.guid);
      const linkedAccountAnalyses = accountAnalyses.filter(accountAnalysis =>
        accountAnalysis.facilityAnalysisItems?.some(item =>
          item.facilityId === analysis.facilityId && item.analysisItemId === analysis.guid
        )
      );
      const linkedBankingAnalyses = analyses.filter(item => item.guid === analysis.bankedAnalysisItemId);
      const isBankedByAnotherAnalysis = analyses.some(item => item.bankedAnalysisItemId === analysis.guid);
      return {
        analysis,
        status,
        tone: toneForAnalysisStatus(status),
        linkedAccountAnalyses,
        linkedReports,
        linkedBankingAnalyses,
        isBankedByAnotherAnalysis,
        isActiveForReporting: getIsActiveAnalysis(facility, analysis),
        groupCount: analysis.groups?.length ?? 0,
        regressionCount: analysis.groups?.filter(group => group.analysisType === 'regression').length ?? 0,
        modifiedDate: formatP1AnalysisDate(analysis.modifiedDate)
      };
    })
    .sort((a, b) => a.analysis.name.localeCompare(b.analysis.name));
}

export function buildP1AnalysisSteps(
  analysis: IdbAnalysisItem | undefined,
  status: AnalysisStatusCheck | undefined,
  groupNameForId: (groupId: string) => string = groupId => groupId
): P1FacilityAnalysisStep[] {
  if (!analysis) {
    return [];
  }
  const steps: P1FacilityAnalysisStep[] = [{
    id: 'setup',
    label: 'Analysis Setup',
    tone: toneForAnalysisStatus(status)
  }];
  analysis.groups?.forEach(group => {
    const groupStatus = status?.getGroupStatusChecksByGroupId(group.idbGroupId);
    const groupName = groupNameForId(group.idbGroupId);
    steps.push({
      id: 'group-setup',
      label: `${groupName} Setup`,
      groupId: group.idbGroupId,
      tone: toneForGroupStatus(groupStatus)
    });
    if (group.analysisType === 'regression' && !isSkippedGroup(group)) {
      steps.push({
        id: 'regression',
        label: `${groupName} Regression`,
        groupId: group.idbGroupId,
        tone: groupStatus?.hasModelErrors ? 'danger' : toneForGroupStatus(groupStatus)
      });
    }
    if (!isSkippedGroup(group)) {
      steps.push({
        id: 'group-annual',
        label: `${groupName} Annual`,
        groupId: group.idbGroupId,
        tone: groupStatus?.status === 'error' ? 'danger' : 'neutral',
        disabled: groupStatus?.status === 'error'
      });
      steps.push({
        id: 'group-monthly',
        label: `${groupName} Monthly`,
        groupId: group.idbGroupId,
        tone: groupStatus?.status === 'error' ? 'danger' : 'neutral',
        disabled: groupStatus?.status === 'error'
      });
    }
  });
  steps.push(
    { id: 'facility-annual', label: 'Facility Annual', tone: status?.status === 'error' ? 'danger' : 'neutral', disabled: status?.status === 'error' },
    { id: 'facility-monthly', label: 'Facility Monthly', tone: status?.status === 'error' ? 'danger' : 'neutral', disabled: status?.status === 'error' },
    { id: 'references', label: 'Used By', tone: 'info' }
  );
  return steps;
}

export function getP1StepIndex(steps: P1FacilityAnalysisStep[], stepId: P1FacilityAnalysisStepId, groupId?: string): number {
  const exactIndex = steps.findIndex(step => step.id === stepId && step.groupId === groupId);
  if (exactIndex >= 0) {
    return exactIndex;
  }
  return steps.findIndex(step => step.id === stepId);
}

export function getP1GroupName(groupId: string | undefined, groups: Array<{ guid: string; name: string }>): string {
  if (!groupId) {
    return 'Facility';
  }
  return groups.find(group => group.guid === groupId)?.name || groupId;
}

export function getP1AnalysisCategoryLabel(category: AnalysisCategory): string {
  return category === 'water' ? 'Water Analysis' : 'Energy Analysis';
}

export function getP1AnalysisTypeLabel(type: AnalysisType): string {
  switch (type) {
    case 'absoluteEnergyConsumption':
      return 'Absolute';
    case 'energyIntensity':
      return 'Classic Intensity';
    case 'modifiedEnergyIntensity':
      return 'Modified Intensity';
    case 'regression':
      return 'Regression';
    case 'skipAnalysis':
      return 'Skip Analysis';
    case 'skip':
      return 'Excluded';
    default:
      return type;
  }
}

export function getP1SelectedModel(group: AnalysisGroup | undefined): JStatRegressionModel | undefined {
  if (!group?.selectedModelId) {
    return undefined;
  }
  return group.models?.find(model => model.modelId === group.selectedModelId);
}

export function toneForAnalysisStatus(status: AnalysisStatusCheck | undefined): P1StatusTone {
  if (!status) {
    return 'neutral';
  }
  if (status.status === 'error') {
    return 'danger';
  }
  if (status.status === 'warning') {
    return 'warning';
  }
  return 'success';
}

export function toneForGroupStatus(status: AnalysisGroupStatusCheck | undefined): P1StatusTone {
  if (!status) {
    return 'neutral';
  }
  if (status.status === 'error') {
    return 'danger';
  }
  if (status.status === 'warning') {
    return 'warning';
  }
  return 'success';
}

export function isSkippedGroup(group: AnalysisGroup): boolean {
  return group.analysisType === 'skip' || group.analysisType === 'skipAnalysis';
}

export function formatP1AnalysisDate(value: Date | string | undefined): string {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function cloneP1AnalysisWithGroup(analysis: IdbAnalysisItem, group: AnalysisGroup): IdbAnalysisItem {
  return {
    ...structuredClone(analysis),
    groups: analysis.groups.map(item => item.idbGroupId === group.idbGroupId ? structuredClone(group) : structuredClone(item))
  };
}

function getIsActiveAnalysis(facility: IdbFacility | undefined, analysis: IdbAnalysisItem): boolean {
  if (!facility) {
    return false;
  }
  return analysis.analysisCategory === 'energy'
    ? facility.selectedEnergyAnalysisId === analysis.guid
    : facility.selectedWaterAnalysisId === analysis.guid;
}

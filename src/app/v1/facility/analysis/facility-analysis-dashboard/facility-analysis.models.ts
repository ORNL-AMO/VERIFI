import { AnalysisCategory } from '@data/models/analysis';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { FacilityAnalysisOutcomeDisplay, FacilityAnalysisOutcomeState } from '../facility-analysis-outcome-summary';
import { buildFacilityAnalysisGroupModelViews } from '../group-model-roster/facility-analysis-group-model.view';

export type FacilityAnalysisCardStatus = 'evaluating' | 'ready' | 'warning' | 'error';

export interface FacilityAnalysisCard {
  readonly analysis: IdbAnalysisItem;
  readonly category: AnalysisCategory;
  readonly status: FacilityAnalysisCardStatus;
  readonly statusLabel: string;
  readonly findings: readonly StatusItem[];
  readonly isActiveForReporting: boolean;
  readonly linkedAccountAnalyses: readonly IdbAccountAnalysisItem[];
  readonly linkedReports: readonly IdbFacilityReport[];
  readonly bankingSource?: IdbAnalysisItem;
  readonly bankingConsumers: readonly IdbAnalysisItem[];
  readonly dependencyCount: number;
  readonly modifiedDateLabel: string;
  readonly modifiedSortValue: number;
  readonly searchText: string;
  readonly attentionRank: number;
}

export interface FacilityAnalysisDashboardCard extends FacilityAnalysisCard {
  readonly outcome: FacilityAnalysisOutcomeState;
  readonly outcomeDisplay: FacilityAnalysisOutcomeDisplay;
}

export interface BuildFacilityAnalysisCardsInput {
  readonly analyses: readonly IdbAnalysisItem[];
  readonly accountAnalyses: readonly IdbAccountAnalysisItem[];
  readonly reports: readonly IdbFacilityReport[];
  readonly meterGroups: readonly IdbUtilityMeterGroup[];
  readonly facility?: IdbFacility;
  readonly statusItems: readonly StatusItem[];
  readonly statusState: StatusEvaluationState;
}

export function buildFacilityAnalysisCards(input: BuildFacilityAnalysisCardsInput): FacilityAnalysisCard[] {
  return input.analyses.map(analysis => {
    const findings = input.statusItems.filter(item =>
      (item.entity.kind === 'facility-analysis' && item.entity.guid === analysis.guid)
      || (item.entity.kind === 'analysis-group' && item.entity.guid.startsWith(`${analysis.guid}:`))
    );
    const status = resolveStatus(input.statusState, findings);
    const groupModels = buildFacilityAnalysisGroupModelViews(analysis, input.meterGroups);
    const linkedAccountAnalyses = input.accountAnalyses.filter(item =>
      item.facilityAnalysisItems?.some(link =>
        link.facilityId === analysis.facilityId && link.analysisItemId === analysis.guid
      )
    );
    const linkedReports = input.reports.filter(report => report.analysisItemId === analysis.guid);
    const bankingSource = input.analyses.find(item => item.guid === analysis.bankedAnalysisItemId);
    const bankingConsumers = input.analyses.filter(item => item.bankedAnalysisItemId === analysis.guid);
    const isActiveForReporting = analysis.analysisCategory === 'water'
      ? input.facility?.selectedWaterAnalysisId === analysis.guid
      : input.facility?.selectedEnergyAnalysisId === analysis.guid;
    const modifiedSortValue = safeDateValue(analysis.modifiedDate);
    const dependencyCount = linkedAccountAnalyses.length + linkedReports.length + bankingConsumers.length;
    const statusLabel = status === 'evaluating'
      ? 'Evaluating'
      : status === 'ready'
        ? 'Ready'
        : status === 'warning' ? 'Warning' : 'Error';
    const searchable = [
      analysis.name,
      analysis.analysisCategory,
      statusLabel,
      analysis.baselineYear,
      analysis.energyIsSource ? 'source energy' : 'site energy',
      isActiveForReporting ? 'active reporting' : '',
      ...groupModels.flatMap(group => [group.name, group.methodLabel, group.modelLabel, group.equationLabel]),
      ...linkedAccountAnalyses.map(item => item.name),
      ...linkedReports.map(item => item.name),
      bankingSource?.name ?? '',
      ...bankingConsumers.map(item => item.name)
    ].join(' ').toLocaleLowerCase();
    return {
      analysis,
      category: analysis.analysisCategory,
      status,
      statusLabel,
      findings,
      isActiveForReporting,
      linkedAccountAnalyses,
      linkedReports,
      bankingSource,
      bankingConsumers,
      dependencyCount,
      modifiedDateLabel: formatDate(analysis.modifiedDate),
      modifiedSortValue,
      searchText: searchable,
      attentionRank: status === 'error' ? 0 : status === 'warning' ? 1 : status === 'evaluating' ? 2 : 3
    };
  }).sort((first, second) => first.analysis.name.localeCompare(second.analysis.name));
}

function resolveStatus(state: StatusEvaluationState, findings: readonly StatusItem[]): FacilityAnalysisCardStatus {
  if (state !== 'ready') return state === 'error' ? 'error' : 'evaluating';
  if (findings.some(item => item.severity === 'error')) return 'error';
  if (findings.some(item => item.severity === 'warning')) return 'warning';
  return 'ready';
}

function safeDateValue(value: Date): number {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value: Date): string {
  const timestamp = safeDateValue(value);
  return timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
}

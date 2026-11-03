import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisInventoryEntry, analysisInventoryStatusLabel } from '@app/v1/analysis/inventory/analysis-inventory.models';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import { IconName } from '@app/v1/shared/icons/icon-registry';

export interface ReportAnalysisSelectionCard {
  readonly value: string;
  readonly name: string;
  readonly category: string;
  readonly categoryValue?: 'energy' | 'water';
  readonly baselineYear?: number;
  readonly baseline: number | string;
  readonly statusLabel: string;
  readonly statusTone: 'success' | 'danger' | 'warning' | 'neutral';
  readonly statusIcon: IconName;
}

export function reportAnalysisSelectionCard(value: string,
  analysis: Pick<IdbAnalysisItem, 'name' | 'analysisCategory' | 'baselineYear'> | undefined,
  status: AnalysisInventoryEntry['card']['status'] | undefined, evaluation: StatusEvaluationState): ReportAnalysisSelectionCard {
  const currentStatus = evaluation === 'ready' ? status ?? 'evaluating' : 'evaluating';
  return { value, name: analysis?.name || 'Untitled analysis', category: analysis?.analysisCategory === 'water' ? 'Water' : 'Energy',
    categoryValue: analysis?.analysisCategory, baselineYear: analysis?.baselineYear, baseline: analysis?.baselineYear ?? 'Not set',
    statusLabel: analysisInventoryStatusLabel(currentStatus, evaluation),
    statusTone: currentStatus === 'ready' ? 'success' : currentStatus === 'error' ? 'danger' : currentStatus === 'warning' ? 'warning' : 'neutral',
    statusIcon: currentStatus === 'evaluating' ? evaluation === 'error' ? 'info' : 'loading' : currentStatus === 'ready' ? 'success' : 'warning' };
}

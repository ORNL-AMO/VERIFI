import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { summarizeStatusAttention } from '@app/v1/status/status.dismissals';
import { StatusAttentionSummary, StatusItem } from '@app/v1/status/status.models';

export type PredictorWorkbenchTabId = 'settings' | 'readings' | 'quality';

export interface PredictorWorkbenchTab {
  readonly id: PredictorWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
}

export type PredictorWorkbenchTabAttention = Readonly<Partial<Record<PredictorWorkbenchTabId, StatusAttentionSummary>>>;

export const PREDICTOR_WORKBENCH_TABS: ReadonlyArray<PredictorWorkbenchTab> = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'readings', label: 'Readings', icon: 'table' },
  { id: 'quality', label: 'Quality Report', icon: 'warning' }
];

export function buildPredictorWorkbenchTabAttention(
  findings: readonly StatusItem[]
): PredictorWorkbenchTabAttention {
  const attention: Partial<Record<PredictorWorkbenchTabId, StatusAttentionSummary>> = {};
  PREDICTOR_WORKBENCH_TABS.forEach(tab => {
    const summary = summarizeStatusAttention(findings.filter(finding =>
      finding.destination.kind === 'predictor-tab' && finding.destination.tab === tab.id
    ));
    if (summary.total > 0) attention[tab.id] = summary;
  });
  return attention;
}

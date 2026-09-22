import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type PredictorWorkbenchTabId = 'settings' | 'readings' | 'quality';

export interface PredictorWorkbenchTab {
  readonly id: PredictorWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
}

export const PREDICTOR_WORKBENCH_TABS: ReadonlyArray<PredictorWorkbenchTab> = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'readings', label: 'Readings', icon: 'table' },
  { id: 'quality', label: 'Quality Report', icon: 'warning' }
];

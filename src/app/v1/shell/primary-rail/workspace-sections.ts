import type { SectionId } from '@app/v1/routing/workspace-route';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export interface SectionDefinition {
  readonly id: SectionId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: IconName;
  readonly enabled: boolean;
}

export const WORKSPACE_SECTIONS: ReadonlyArray<SectionDefinition> = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: 'home', enabled: true },
  { id: 'data', label: 'Data', shortLabel: 'Data', icon: 'database', enabled: false },
  { id: 'visualization', label: 'Visualization', shortLabel: 'Visuals', icon: 'dataVisualization', enabled: false },
  { id: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: 'analysis', enabled: false },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'reports', enabled: false },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings', enabled: true },
  { id: 'imports', label: 'Upload', shortLabel: 'Upload', icon: 'uploadData', enabled: true }
];

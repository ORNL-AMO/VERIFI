import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationDecisionAction } from '../../decisions/decision-types';

export interface UtilityEditorContext {
  readonly definition: VisualizationDefinition;
  readonly sourceId: string;
  readonly disabled: boolean;
  readonly changed: (definition: VisualizationDefinition) => void;
  readonly editorKey?: string;
  readonly resetKey?: number;
  readonly validityChanged?: (invalid: boolean) => void;
  readonly request?: (action: VisualizationDecisionAction) => void;
  readonly expandedNodes?: ReadonlySet<string>;
  readonly sectionChanged?: (id: string, expanded: boolean) => void;
  readonly nodeValidityChanged?: (id: string, invalid: boolean) => void;
  readonly nodeResetKeys?: Readonly<Record<string, number>>;
  readonly draftChanged?: () => void;
}

export type PeriodSettingsChange = Pick<VisualizationDefinition, 'period' | 'comparison'>;
export type PeriodSettingsContext = Pick<UtilityEditorContext, 'definition' | 'disabled' | 'editorKey' | 'resetKey' | 'validityChanged' | 'draftChanged'> & {
  readonly changed: (change: PeriodSettingsChange) => void;
};

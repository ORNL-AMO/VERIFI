import type { VisualizationSourceEditorContext } from '../../preview/preview-registry';

export interface UtilityEditorContext extends VisualizationSourceEditorContext {
  readonly editorKey?: string;
  readonly resetKey?: number;
  readonly validityChanged?: (invalid: boolean) => void;
}

export type PeriodSettingsContext = Pick<UtilityEditorContext, 'definition' | 'disabled' | 'changed' | 'editorKey' | 'resetKey' | 'validityChanged'>;

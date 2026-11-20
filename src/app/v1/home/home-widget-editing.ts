export interface HomeWidgetChoiceDraft {
  readonly kind: 'note' | 'visualization' | 'shortcut' | 'built-in-chart' | 'actions' | 'energy-goal' | 'water-goal' | 'facility-progress';
  readonly recipe?: string;
  readonly visualizationGuids: readonly string[];
  readonly shortcutKeys: readonly string[];
}
export const EMPTY_HOME_WIDGET_CHOICE: HomeWidgetChoiceDraft = { kind: 'note', visualizationGuids: [], shortcutKeys: [] };

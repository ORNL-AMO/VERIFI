export interface HomeWidgetChoiceDraft {
  readonly kind: 'note' | 'visualization' | 'shortcut';
  readonly visualizationGuids: readonly string[];
  readonly shortcutKeys: readonly string[];
}
export const EMPTY_HOME_WIDGET_CHOICE: HomeWidgetChoiceDraft = { kind: 'note', visualizationGuids: [], shortcutKeys: [] };

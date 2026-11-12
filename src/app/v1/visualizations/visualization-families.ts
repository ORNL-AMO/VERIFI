import type { VisualizationSourceKind } from '@domain/visualizations/visualization-definition';

/** Pure presentation catalog: creation must not depend on inventory or workspace initialization. */
export function visualizationFamilyChoices(): readonly { value: VisualizationSourceKind; label: string }[] {
  return [
  { value: 'utility', label: 'Utility' }, { value: 'predictor', label: 'Predictor' }, { value: 'weather', label: 'Weather' },
  { value: 'energy-use', label: 'Energy Use' }, { value: 'analysis-result', label: 'Analysis Result' }, { value: 'analysis-model', label: 'Analysis Model' }
  ];
}

export const VISUALIZATION_FAMILIES = visualizationFamilyChoices();

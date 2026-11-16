export type VisualizationRecipe = 'custom' | 'energy-trend' | 'cost-trend';

/** Presets seed the shared decision tree; they do not own a separate workflow. */
export const UTILITY_RECIPES = [
  { id: 'energy-trend' as const, label: 'Energy usage trend', measure: 'energy' as const },
  { id: 'cost-trend' as const, label: 'Utility cost trend', measure: 'cost' as const }
];

import type { VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

/** Shared presentation catalog. Selecting a category does not request data or establish chart compatibility. */
export function visualizationDataSourceChoices(): readonly { readonly value: VisualizationSourceKind; readonly label: string; readonly icon: IconName }[] {
  return [
    { value: 'utility', label: 'Meters', icon: 'meter' },
    { value: 'predictor', label: 'Predictors', icon: 'predictor' },
    { value: 'energy-use', label: 'Energy Use', icon: 'energyUseGroup' },
    { value: 'analysis', label: 'Analysis', icon: 'analysis' }
  ];
}

export const VISUALIZATION_DATA_SOURCES = visualizationDataSourceChoices();

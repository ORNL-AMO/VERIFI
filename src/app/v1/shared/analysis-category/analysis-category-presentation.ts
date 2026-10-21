import { AnalysisCategory } from '@data/models/analysis';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getIsEnergyMeter } from '@shared/sharedHelperFunctions';

/** Saved analyses keep their category discoverable after their meters are removed. */
export function analysisCategories(
  meters: readonly Pick<IdbUtilityMeter, 'source'>[],
  analyses: readonly { analysisCategory: AnalysisCategory }[]
): readonly AnalysisCategory[] {
  const categories = new Set(analyses.map(analysis => analysis.analysisCategory));
  for (const meter of meters) {
    if (getIsEnergyMeter(meter.source)) categories.add('energy');
    else if (meter.source === 'Water Intake' || meter.source === 'Water Discharge') categories.add('water');
  }
  return (['energy', 'water'] as const).filter(category => categories.has(category));
}

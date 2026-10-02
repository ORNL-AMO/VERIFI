import type { AnalysisCategory } from '@data/models/analysis';

export function modeledQuantityLabel(category: AnalysisCategory | undefined): string {
  return category === 'water' ? 'Modeled Water' : 'Modeled Energy';
}

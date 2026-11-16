import type { VisualizationScope } from './visualization-definition';

/** Runtime ownership and inclusion must both match before accepting asynchronous evidence. */
export function sameVisualizationScope(left: VisualizationScope, right: VisualizationScope): boolean {
  const orderedRight = [...right.facilityGuids].sort();
  return left.kind === right.kind && (left.kind !== 'facility' || right.kind === 'facility' && left.facilityGuid === right.facilityGuid)
    && left.facilityGuids.length === right.facilityGuids.length
    && [...left.facilityGuids].sort().every((guid, index) => guid === orderedRight[index]);
}

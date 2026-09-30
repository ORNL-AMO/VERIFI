export type ImportMappingType = 'meter' | 'predictor';

export interface ImportMappingCardView {
  readonly id: string;
  readonly label: string;
  readonly index: number;
  readonly facilityId?: string;
}

export interface ImportMappingLaneView {
  readonly id: string;
  readonly facilityId?: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly unmapped: boolean;
  readonly cards: readonly ImportMappingCardView[];
  readonly totalCount: number;
}

export interface ImportMappingDestinationView {
  readonly id: string;
  readonly facilityId?: string;
  readonly label: string;
}

export interface ImportMappingStatus {
  readonly totalCount: number;
  readonly mappedCount: number;
  readonly unmappedCount: number;
  readonly ready: boolean;
}

export interface ImportMappingBoardView {
  readonly type: ImportMappingType;
  readonly itemLabel: 'meters' | 'predictors';
  readonly unmappedLane: ImportMappingLaneView;
  readonly facilityLanes: readonly ImportMappingLaneView[];
  readonly lanes: readonly ImportMappingLaneView[];
  readonly destinations: readonly ImportMappingDestinationView[];
  readonly connectedDropListIds: string[];
  readonly status: ImportMappingStatus;
}

export const UNMAPPED_FACILITY_TARGET = '__unmapped__';

export function importMappingDropListId(type: ImportMappingType, laneId: string): string {
  return `import-${type}-mapping-${laneId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

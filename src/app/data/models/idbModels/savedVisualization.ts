import { getNewIdbEntry, IdbEntry } from './idbEntry';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationGuidMaps, VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';

export const SAVED_VISUALIZATION_RECORD_VERSION = 1;

export interface VisualizationTransferContext {
  readonly accountId: string;
  readonly targetAccountId: string;
  readonly maps: VisualizationGuidMaps;
}

export interface VisualizationPreservation {
  /** Opaque transferred payloads cannot activate simply because a newer decoder recognizes them. */
  readonly locked?: boolean;
  readonly references: readonly VisualizationReferenceIssue[];
  /** Ordered hops preserve opaque references through repeated transfers without guessing their schema. */
  readonly transfers: readonly VisualizationTransferContext[];
}

export interface IdbSavedVisualization extends IdbEntry {
  accountId: string;
  /** Context for opaque preserved payloads only; current ownership derives from facilitySelection. */
  facilityId?: string;
  recordVersion: number;
  revision: number;
  /** Retain unreadable backup definitions; the data boundary decodes supported JSON separately. */
  definition: unknown;
  preservation?: VisualizationPreservation;
}

/** Creation may reuse a submitted identity so retries cannot allocate another saved record. */
export function getNewIdbSavedVisualization(
  definition: VisualizationDefinition,
  idbEntry: IdbEntry = getNewIdbEntry()
): IdbSavedVisualization {
  return {
    ...idbEntry,
    accountId: definition.accountGuid,
    recordVersion: SAVED_VISUALIZATION_RECORD_VERSION,
    revision: 1,
    definition: structuredClone(definition)
  };
}

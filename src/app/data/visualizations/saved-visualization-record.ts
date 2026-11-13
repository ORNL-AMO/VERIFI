import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition, VisualizationIssue } from '@domain/visualizations/visualization-validation';
import { IdbSavedVisualization, SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';

export type SavedVisualizationReadResult =
  | { readonly state: 'valid' | 'setup-required'; readonly record: Readonly<IdbSavedVisualization>;
      readonly definition: VisualizationDefinition; readonly issues: readonly VisualizationIssue[] }
  | { readonly state: 'invalid' | 'unsupported' | 'repair-required'; readonly record: Readonly<IdbSavedVisualization>;
      readonly issues: readonly VisualizationIssue[] };

/** Version routing is pure: no migration writes or destructive normalization during workspace loading. */
export function readSavedVisualization(record: Readonly<IdbSavedVisualization>): SavedVisualizationReadResult {
  const envelopeError = savedVisualizationEnvelopeError(record);
  if (envelopeError) return { state: 'invalid', record,
    issues: [{ path: '$', code: 'invalid', message: envelopeError }] };
  if (record.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION) return { state: 'unsupported', record,
    issues: [{ path: '$.recordVersion', code: 'unsupported', message: 'Unsupported saved visualization record version.' }] };
  if (record.preservation?.locked || record.preservation?.references.length) return { state: 'repair-required', record,
    issues: [{ path: '$.preservation', code: 'invalid', message: 'Verify or repair transferred source relationships before using this visualization.' }] };
  const decoded = decodeVisualizationDefinition(record.definition);
  if (!('definition' in decoded)) return { state: decoded.state, record, issues: decoded.issues };
  return { state: decoded.state, record, definition: decoded.definition, issues: decoded.issues };
}

/** Validate the stable outer envelope before any restore deletes or writes. Payload validity is separate. */
export function savedVisualizationEnvelopeError(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Expected a saved visualization record.';
  const record = value as IdbSavedVisualization;
  if (!nonblank(record.guid) || !nonblank(record.accountId) || (record.facilityId !== undefined && !nonblank(record.facilityId)))
    return 'Saved visualization identity or ownership is invalid.';
  if (!Number.isSafeInteger(record.recordVersion) || record.recordVersion < 1 || !Number.isSafeInteger(record.revision) || record.revision < 1)
    return 'Saved visualization version or revision is invalid.';
  if (!validDate(record.createdDate) || !validDate(record.modifiedDate) || !Object.hasOwn(record, 'definition'))
    return 'Saved visualization dates or payload are missing.';
  if (!isJsonValue(record.definition)) return 'Saved visualization payload must be losslessly serializable JSON.';
  if (record.preservation !== undefined) {
    const preservation = record.preservation;
    if (!preservation || typeof preservation !== 'object' || (preservation.locked !== undefined && typeof preservation.locked !== 'boolean')
      || !Array.isArray(preservation.references) || !Array.isArray(preservation.transfers)) return 'Invalid visualization preservation metadata.';
    const kinds = ['facility', 'meter', 'meter-group', 'predictor', 'equipment', 'energy-use-group', 'analysis', 'model', 'charge', 'unknown'];
    if (preservation.references.some(ref => !ref || !nonblank(ref.path) || !nonblank(ref.guid) || !kinds.includes(ref.kind)
      || !['missing', 'foreign', 'not-transferred', 'unclassified'].includes(ref.reason))) return 'Invalid preserved visualization reference.';
    if (preservation.transfers.some(hop => !hop || !nonblank(hop.accountId) || !nonblank(hop.targetAccountId)
      || !hop.maps || typeof hop.maps !== 'object' || Array.isArray(hop.maps)
      || Object.entries(hop.maps).some(([kind, map]) => !kinds.includes(kind) || !map || typeof map !== 'object' || Array.isArray(map)
        || Object.entries(map).some(([key, target]) => !nonblank(key) || !nonblank(target))))) return 'Invalid visualization transfer context.';
  }
  const decoded = decodeVisualizationDefinition(record.definition);
  // Opaque transferred payloads intentionally retain their original owner; the lock prevents use.
  if ((decoded.state === 'valid' || decoded.state === 'setup-required') && !record.preservation?.locked) {
    if (decoded.definition.accountGuid !== record.accountId || (decoded.definition.scope.kind === 'facility'
      ? decoded.definition.scope.facilityGuid !== record.facilityId : record.facilityId !== undefined))
      return 'Saved visualization payload contradicts its outer ownership.';
  }
  return undefined;
}

function nonblank(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validDate(value: unknown): boolean {
  return (typeof value === 'string' || value instanceof Date) && Number.isFinite(new Date(value).getTime());
}

function isJsonValue(value: unknown, ancestors = new Set<object>(), depth = 0): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || ancestors.has(value) || depth > 100) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  ancestors.add(value);
  const array = Array.isArray(value);
  const keys = Reflect.ownKeys(value).filter(key => !array || key !== 'length');
  const valid = (!array || keys.length === value.length && keys.every(key => typeof key === 'string'
    && String(Number(key)) === key && Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < value.length))
    && keys.every(key => typeof key === 'string' && Object.getOwnPropertyDescriptor(value, key)?.enumerable
      && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')
      && isJsonValue(value[key], ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}

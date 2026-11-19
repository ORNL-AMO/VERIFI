import { HOME_FORMAT_VERSION, HomeDashboardDefinition, HomeOwnerState } from '@domain/home/home-dashboard';
import { decodeHomeDashboard, decodeHomeOwnerState, homeJson, homePositiveInteger, homeText } from '@domain/home/home-validation';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { IdbHomeRecord } from '@data/models/idbModels/homeRecord';

/** Envelopes remain stable even when an app cannot interpret the versioned payload. */
export function homeEnvelopeError(value: unknown, payload: 'definition' | 'state'): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Expected a Home record.';
  const record = value as IdbHomeDashboard & IdbHomeOwner;
  if (!homeText(record.guid) || !homeText(record.accountId) || record.facilityId !== undefined && !homeText(record.facilityId)) return 'Invalid Home identity or ownership.';
  if (!homePositiveInteger(record.recordVersion) || !homePositiveInteger(record.revision)) return 'Invalid Home record version or revision.';
  if (![record.createdDate, record.modifiedDate].every(date => (date instanceof Date || typeof date === 'string') && Number.isFinite(new Date(date).getTime()))) return 'Invalid Home dates.';
  if (!Object.hasOwn(record, payload) || !homeJson(record[payload])) return 'Home payload must be losslessly serializable JSON.';
  const preservation = record.preservation;
  if (preservation !== undefined && (!preservation || !homeJson(preservation) || !Array.isArray(preservation.references)
    || !Array.isArray(preservation.transfers) || preservation.locked !== undefined && typeof preservation.locked !== 'boolean'
    || preservation.references.some(ref => !ref || !homeText(ref.path) || !homeText(ref.guid)
      || !['dashboard', 'visualization', 'facility', 'analysis', 'meter', 'predictor', 'equipment', 'unknown'].includes(ref.kind)
      || !['not-transferred', 'missing', 'foreign'].includes(ref.reason))
    || preservation.transfers.some(hop => !hop || !homeText(hop.accountId) || !homeText(hop.targetAccountId)
      || !hop.maps || typeof hop.maps !== 'object' || Array.isArray(hop.maps)
      || Object.values(hop.maps).some(map => !map || typeof map !== 'object' || Array.isArray(map)
        || Object.entries(map).some(([from, to]) => !homeText(from) || !homeText(to)))))) return 'Invalid Home preservation metadata.';
  if (payload === 'definition' && record.template !== undefined && !homeJson(record.template)) return 'Template provenance must be serializable JSON.';
  if (payload === 'definition' && record.template !== undefined && record.recordVersion === HOME_FORMAT_VERSION) {
    const template = record.template;
    if (!template || !homeJson(template) || !['home', 'goal-progress', 'energy-use', 'costs', 'emissions', 'water', 'blank'].includes(template.template)
      || !homePositiveInteger(template.version) || typeof template.automatic !== 'boolean' || typeof template.customized !== 'boolean'
      || !Array.isArray(template.chartBaselines) || template.chartBaselines.some(chart => !chart || !homeText(chart.guid) || !homePositiveInteger(chart.revision))
      || new Set(template.chartBaselines.map(chart => chart.guid)).size !== template.chartBaselines.length
      || decodeHomeDashboard(template.baseline).state === 'invalid') return 'Invalid Home template provenance.';
  }
  if (payload === 'definition' && record.creationOperationGuid !== undefined && !homeText(record.creationOperationGuid)) return 'Invalid Home creation receipt.';
  return undefined;
}
export type HomeRecordRead<T> = { readonly state: 'valid'; readonly value: T }
  | { readonly state: 'invalid' | 'unsupported' | 'repair-required'; readonly message: string };
function protectedRecord(record: Readonly<IdbHomeRecord>, payload: 'definition' | 'state'): Exclude<HomeRecordRead<never>, { state: 'valid' }> | undefined {
  const error = homeEnvelopeError(record, payload);
  if (error) return { state: 'invalid', message: error };
  if (record.recordVersion !== HOME_FORMAT_VERSION) return { state: 'unsupported', message: 'This Home record needs another VERIFI version.' };
  if (record.preservation?.locked || record.preservation?.references.some(ref => ref.kind === 'unknown'))
    return { state: 'repair-required', message: 'Preserved Home relationships require explicit review.' };
  return undefined;
}
/** Reference blocks are per-widget: readable dashboards still expose repairable missing links. */
export function readHomeDashboard(record: Readonly<IdbHomeDashboard>): HomeRecordRead<HomeDashboardDefinition> {
  return protectedRecord(record, 'definition') ?? decodeHomeDashboard(record.definition);
}
export function readHomeOwner(record: Readonly<IdbHomeOwner>): HomeRecordRead<HomeOwnerState> {
  return protectedRecord(record, 'state') ?? decodeHomeOwnerState(record.state);
}

import { isStandardPredictor } from '@data/models/idbModels/predictor';
import { IdbFacility } from '@data/models/idbModels/facility';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { PredictorCardView, WeatherStationGroupView } from '../models';

export type PredictorStatusFilter = 'all' | 'attention' | 'noReadings' | 'clear';
export type PredictorTypeFilter = 'all' | 'standard' | 'weather';
export type PredictorInventorySort = 'attention' | 'predictorName' | 'facilityName' | 'latestReading';
export interface PredictorInventoryFilters { search: string; type: PredictorTypeFilter; status: PredictorStatusFilter; sort: PredictorInventorySort; }
export interface PredictorStatusView { readonly tone: 'danger' | 'warning' | 'success' | 'neutral'; readonly label: string; readonly icon: IconName; }
export interface PredictorInventoryEntry {
  readonly guid: string;
  readonly card: PredictorCardView;
  readonly facility: IdbFacility;
  readonly station?: WeatherStationGroupView;
  readonly status: PredictorStatusView;
  readonly chip: string;
  readonly searchText: string;
  readonly attentionRank: number;
  readonly canDelete: boolean;
  readonly canCopy: boolean;
}
export interface PredictorInventoryGroup {
  readonly key: string;
  readonly station?: WeatherStationGroupView;
  readonly status: PredictorStatusView;
  readonly entries: readonly PredictorInventoryEntry[];
}
export type PredictorInventoryAction = 'settings' | 'readings' | 'quality' | 'copy' | 'delete';
export interface PredictorInventoryActionRequest { readonly guid: string; readonly action: PredictorInventoryAction; }

export function predictorStatusPresentation(tone: string, state: StatusEvaluationState): PredictorStatusView {
  if (state !== 'ready') return { tone: 'neutral', label: state === 'error' ? 'Checks unavailable' : 'Checks pending', icon: state === 'error' ? 'info' : 'loading' };
  return tone === 'danger' ? { tone, label: 'Has errors', icon: 'danger' }
    : tone === 'warning' ? { tone, label: 'Has warnings', icon: 'warning' }
      : tone === 'success' ? { tone, label: 'All data valid', icon: 'success' }
        : { tone: 'neutral', label: 'Checks pending', icon: 'loading' };
}

export function buildPredictorInventory(cards: readonly PredictorCardView[], stations: readonly WeatherStationGroupView[], facility: IdbFacility, state: StatusEvaluationState): PredictorInventoryEntry[] {
  return cards.map(card => {
    const station = stations.find(group => group.predictors.some(item => item.guid === card.predictor.guid));
    const repair = station && (station.needsStationRepair || station.hasConflictingStationNames);
    const tone = repair && card.statusTone !== 'danger' && state === 'ready' ? 'warning' : card.statusTone;
    const status = predictorStatusPresentation(tone, state);
    const chip = station ? [card.weatherTypeLabel, card.baseTemperatureLabel].filter(Boolean).join(' · ')
      : card.predictor.production ? 'Production' : card.typeLabel;
    return { guid: card.predictor.guid, card, facility, station, status, chip,
      searchText: [facility.name, card.searchText, station?.stationName, station?.stationId, station?.needsStationRepair ? 'Station required' : '', station?.hasConflictingStationNames ? 'Station names differ' : '', status.label, chip].join(' ').toLowerCase(),
      attentionRank: status.tone === 'danger' ? 0 : !card.readingCount ? 1 : status.tone === 'warning' ? 2 : status.tone === 'neutral' ? 3 : 4,
      canCopy: isStandardPredictor(card.predictor), canDelete: isStandardPredictor(card.predictor) || card.predictor.predictorType === 'Weather' };
  });
}

export function filterPredictorInventory(entries: readonly PredictorInventoryEntry[], filters: PredictorInventoryFilters): PredictorInventoryEntry[] {
  const query = filters.search.trim().toLowerCase();
  return entries.filter(entry => (!query || entry.searchText.includes(query))
    && (filters.type === 'all' || (filters.type === 'weather' ? !!entry.station : !entry.station))
    && (filters.status === 'all' || (filters.status === 'attention' && ['danger', 'warning'].includes(entry.status.tone))
      || (filters.status === 'noReadings' && !entry.card.readingCount)
      || (filters.status === 'clear' && entry.card.readingCount > 0 && entry.status.tone === 'success')));
}

function compareEntries(a: PredictorInventoryEntry, b: PredictorInventoryEntry, sort: PredictorInventorySort): number {
  const priority = sort === 'attention' ? a.attentionRank - b.attentionRank
    : sort === 'latestReading' ? compareLatest(a.card.latestReadingSortValue, b.card.latestReadingSortValue) : 0;
  return priority || a.card.predictor.name.localeCompare(b.card.predictor.name) || a.guid.localeCompare(b.guid);
}
function compareLatest(a: number, b: number): number { return a === b ? 0 : a > b ? -1 : 1; }
export function groupPredictorInventory(entries: readonly PredictorInventoryEntry[], sort: PredictorInventorySort): PredictorInventoryGroup[] {
  const groups = new Map<string, PredictorInventoryEntry[]>();
  for (const entry of entries) {
    const key = entry.station ? `weather:${entry.station.routeKey}` : `standard:${entry.guid}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()].map(([key, children]) => {
    const ordered = [...children].sort((a, b) => compareEntries(a, b, sort));
    const worst = [...children].sort((a, b) => ({ danger: 0, warning: 1, neutral: 2, success: 3 }[a.status.tone] - { danger: 0, warning: 1, neutral: 2, success: 3 }[b.status.tone]))[0];
    return { key, entries: ordered, station: ordered[0].station, status: worst.status };
  }).sort((a, b) => {
    const priority = sort === 'attention' ? Math.min(...a.entries.map(item => item.attentionRank)) - Math.min(...b.entries.map(item => item.attentionRank))
      : sort === 'latestReading' ? compareLatest(Math.max(...a.entries.map(item => item.card.latestReadingSortValue)), Math.max(...b.entries.map(item => item.card.latestReadingSortValue))) : 0;
    return priority || (a.station?.stationName ?? a.entries[0].card.predictor.name).localeCompare(b.station?.stationName ?? b.entries[0].card.predictor.name) || a.key.localeCompare(b.key);
  });
}
export function orderPredictorInventory(entries: readonly PredictorInventoryEntry[], sort: PredictorInventorySort): PredictorInventoryEntry[] {
  return [...entries].sort((a, b) => compareEntries(a, b, sort));
}

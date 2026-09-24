import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { StatusItem } from '@app/v1/status/status.models';
import {
  PredictorCardStatusTone,
  PredictorCardView,
  buildPredictorCard,
  formatPredictorReadingMonth,
  weatherDataTypeLabel
} from './predictor-card.models';

export interface WeatherStationGroupView {
  readonly routeKey: string;
  readonly stationId?: string;
  readonly stationName: string;
  readonly predictors: readonly IdbPredictor[];
  readonly predictorCards: readonly PredictorCardView[];
  readonly readingCount: number;
  readonly firstReadingLabel: string;
  readonly latestReadingLabel: string;
  readonly latestReadingSortValue: number;
  readonly outputSummary: string;
  readonly statusFindings: readonly StatusItem[];
  readonly statusLabel: string;
  readonly statusTone: PredictorCardStatusTone;
  readonly hasConflictingStationNames: boolean;
  readonly needsStationRepair: boolean;
  readonly searchText: string;
}

export type PredictorBrowseItem =
  | { readonly kind: 'standard'; readonly card: PredictorCardView }
  | { readonly kind: 'weather'; readonly group: WeatherStationGroupView };

export function buildWeatherStationGroups(
  predictors: readonly IdbPredictor[],
  readings: readonly IdbPredictorData[],
  statusFindings: readonly StatusItem[] = [],
  statusReady = true
): readonly WeatherStationGroupView[] {
  const groups = new Map<string, IdbPredictor[]>();
  for (const predictor of predictors.filter(item => item.predictorType === 'Weather')) {
    const routeKey = weatherStationRouteKey(predictor);
    groups.set(routeKey, [...(groups.get(routeKey) ?? []), predictor]);
  }

  return [...groups.entries()]
    .map(([routeKey, groupPredictors]) => buildWeatherStationGroup(
      routeKey,
      groupPredictors,
      readings,
      statusFindings,
      statusReady
    ))
    .sort((first, second) => first.stationName.localeCompare(second.stationName)
      || first.routeKey.localeCompare(second.routeKey));
}

export function weatherStationRouteKey(predictor: IdbPredictor): string {
  return predictor.weatherStationId
    ? `station:${predictor.weatherStationId}`
    : `predictor:${predictor.guid}`;
}

function buildWeatherStationGroup(
  routeKey: string,
  predictors: readonly IdbPredictor[],
  readings: readonly IdbPredictorData[],
  statusFindings: readonly StatusItem[],
  statusReady: boolean
): WeatherStationGroupView {
  const orderedPredictors = [...predictors].sort((first, second) =>
    (first.name || '').localeCompare(second.name || '') || first.guid.localeCompare(second.guid));
  const predictorIds = new Set(orderedPredictors.map(predictor => predictor.guid));
  const groupReadings = readings
    .filter(reading => predictorIds.has(reading.predictorId))
    .sort(compareReadings);
  const groupFindings = statusFindings.filter(finding =>
    finding.entity.kind === 'predictor' && predictorIds.has(finding.entity.guid));
  const predictorCards = orderedPredictors.map(predictor => buildPredictorCard(
    predictor,
    groupReadings.filter(reading => reading.predictorId === predictor.guid),
    groupFindings.filter(finding => finding.entity.guid === predictor.guid),
    statusReady
  ));
  const stationNames = [...new Set(orderedPredictors.map(predictor => predictor.weatherStationName).filter(Boolean))];
  const stationId = orderedPredictors.find(predictor => !!predictor.weatherStationId)?.weatherStationId;
  const needsStationRepair = !stationId;
  const hasConflictingStationNames = stationNames.length > 1;
  const statusTone = aggregateTone(predictorCards, needsStationRepair || hasConflictingStationNames, statusReady);
  const statusLabel = !statusReady
    ? 'Checking'
    : needsStationRepair ? 'Station required'
      : hasConflictingStationNames ? 'Station names differ'
        : statusTone === 'danger' ? 'Action needed'
          : statusTone === 'warning' ? 'Needs review' : 'Valid';
  const outputSummary = orderedPredictors
    .map(predictor => weatherDataTypeLabel(predictor.weatherDataType))
    .join(', ');

  return {
    routeKey,
    stationId,
    stationName: stationNames[0] || stationId || 'Unassigned weather station',
    predictors: orderedPredictors,
    predictorCards,
    readingCount: groupReadings.length,
    firstReadingLabel: formatPredictorReadingMonth(groupReadings[0]),
    latestReadingLabel: formatPredictorReadingMonth(groupReadings.at(-1)),
    latestReadingSortValue: groupReadings.at(-1)
      ? groupReadings.at(-1)!.year * 12 + groupReadings.at(-1)!.month
      : Number.NEGATIVE_INFINITY,
    outputSummary,
    statusFindings: groupFindings,
    statusLabel,
    statusTone,
    hasConflictingStationNames,
    needsStationRepair,
    searchText: [
      stationNames.join(' '), stationId, outputSummary, statusLabel,
      ...orderedPredictors.flatMap(predictor => [predictor.name, predictor.unit]),
      ...groupFindings.map(finding => `${finding.title} ${finding.description}`)
    ].filter(Boolean).join(' ').toLowerCase()
  };
}

function aggregateTone(
  cards: readonly PredictorCardView[],
  groupWarning: boolean,
  statusReady: boolean
): PredictorCardStatusTone {
  if (!statusReady) return 'info';
  if (cards.some(card => card.statusTone === 'danger')) return 'danger';
  if (groupWarning || cards.some(card => card.statusTone === 'warning')) return 'warning';
  if (cards.some(card => card.statusTone === 'info')) return 'info';
  return 'success';
}

function compareReadings(first: IdbPredictorData, second: IdbPredictorData): number {
  return first.year * 12 + first.month - (second.year * 12 + second.month)
    || first.guid.localeCompare(second.guid);
}

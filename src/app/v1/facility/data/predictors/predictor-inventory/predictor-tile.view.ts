import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import { PredictorInventoryEntry } from './predictor-inventory.models';
import { buildPredictorSnapshots } from './predictor-reading-snapshot.view';

type Navigation = Pick<WorkspaceNavigationService, 'facilityInventoryLink' | 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute' | 'facilityWeatherPredictorRoute' | 'facilityWeatherPredictorQualityRoute'>;

export function buildPredictorTiles(entries: readonly PredictorInventoryEntry[], nav: Navigation, readings: readonly IdbPredictorData[], state: StatusEvaluationState): InventoryTile[] {
  const snapshots = buildPredictorSnapshots(entries, readings, state, nav);
  return entries.map(entry => ({ guid: entry.guid, name: entry.card.predictor.name, icon: entry.card.icon,
    route: entry.station ? nav.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey) : nav.facilityPredictorRoute(entry.facility.guid, entry.guid, 'settings'),
    owner: { label: entry.facility.name, facilityGuid: entry.facility.guid, ...nav.facilityInventoryLink(entry.facility.guid, 'predictors') }, chip: entry.chip,
    simpleChip: entry.station ? entry.card.weatherTypeLabel : undefined,
    station: entry.station ? `${entry.station.stationName}${entry.station.needsStationRepair ? ' · Station required' : entry.station.hasConflictingStationNames ? ' · Station names differ' : ''}` : undefined,
    stationIssue: entry.station?.needsStationRepair ? 'Station required' : entry.station?.hasConflictingStationNames ? 'Station names differ' : undefined,
    status: entry.status,
    stationLink: entry.station ? { label: entry.station.stationName, route: nav.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey) } : undefined,
    predictorSnapshot: snapshots.get(entry.guid)
  }));
}

import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PredictorInventoryEntry } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { PortfolioFacilityInput, PortfolioFacilityView } from './portfolio-facility.view';
import { PortfolioMeterView, PortfolioMeterSort } from './portfolio-meter.view';
import { PortfolioTile } from './portfolio-inventory.models';
import { buildFacilitySnapshots, FacilitySnapshotNavigation } from './portfolio-facility-snapshot.view';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { buildMeterSnapshots } from '@app/v1/shared/inventory/meter-reading-snapshot.view';

export function facilityTiles(views: readonly PortfolioFacilityView[], input: PortfolioFacilityInput, nav: FacilitySnapshotNavigation): PortfolioTile[] {
  const snapshots = buildFacilitySnapshots(input, nav);
  return views.map(view => ({
    guid: view.facility.guid, name: view.facility.name, icon: 'facility', location: view.location || undefined, route: nav.facilityDataRoute(view.facility.guid, 'meters'),
    status: { tone: view.tone, icon: view.icon, label: view.statusLabel },
    facilitySnapshot: snapshots.get(view.facility.guid)
  }));
}
export function meterTiles(views: readonly PortfolioMeterView[], nav: Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute' | 'facilityMeterGroupRoute'>, readings: readonly IdbUtilityMeterData[]): PortfolioTile[] {
  const snapshots = buildMeterSnapshots(views, readings, nav);
  return views.map(view => ({ guid: view.meter.guid, name: view.meter.name, icon: view.sourceIcon,
    route: nav.facilityMeterRoute(view.facility.guid, view.meter.guid, 'settings'),
    owner: { label: view.facility.name, route: nav.facilityDataRoute(view.facility.guid, 'meters') }, chip: view.meter.source,
    status: { tone: view.statusTone, icon: view.statusIcon, label: view.statusLabel },
    meterSnapshot: snapshots.get(view.meter.guid)
  }));
}

export function orderPortfolioMeters(items: readonly PortfolioMeterView[], sort: PortfolioMeterSort): PortfolioMeterView[] {
  return [...items].sort((a, b) => (sort === 'attention' ? a.attentionRank - b.attentionRank : sort === 'latestReading' ? b.latestReading - a.latestReading : a.facility.name.localeCompare(b.facility.name))
    || a.meter.name.localeCompare(b.meter.name) || a.facility.name.localeCompare(b.facility.name) || a.facility.guid.localeCompare(b.facility.guid) || a.meter.guid.localeCompare(b.meter.guid));
}
export function orderPortfolioPredictors(items: readonly PredictorInventoryEntry[], sort: string): PredictorInventoryEntry[] {
  return [...items].sort((a, b) => (sort === 'attention' ? a.attentionRank - b.attentionRank : sort === 'latestReading'
    ? (a.card.latestReadingSortValue === b.card.latestReadingSortValue ? 0 : a.card.latestReadingSortValue > b.card.latestReadingSortValue ? -1 : 1) : a.facility.name.localeCompare(b.facility.name))
    || a.card.predictor.name.localeCompare(b.card.predictor.name) || a.facility.name.localeCompare(b.facility.name) || a.facility.guid.localeCompare(b.facility.guid) || a.guid.localeCompare(b.guid));
}

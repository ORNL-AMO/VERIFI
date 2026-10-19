import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PredictorInventoryEntry } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { PortfolioFacilityInput, PortfolioFacilityView } from './portfolio-facility.view';
import { PortfolioMeterView, PortfolioMeterSort } from './portfolio-meter.view';
import { PortfolioTile } from './portfolio-inventory.models';
import { isDataFinding } from '@app/v1/status/status.models';

type Navigation = Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute' | 'facilityWeatherPredictorRoute' | 'facilityWeatherPredictorQualityRoute'>;
const value = (item: unknown): string => typeof item === 'string' && item.trim() ? item : 'Not set';
const fact = (label: string, text: unknown) => ({ label, value: value(text) });

export function facilityTiles(views: readonly PortfolioFacilityView[], input: PortfolioFacilityInput, nav: Pick<Navigation, 'facilityDataRoute'>): PortfolioTile[] {
  const count = (records: readonly { readonly facilityId: string }[]) => {
    const result = new Map<string, number>(); for (const record of records) result.set(record.facilityId, (result.get(record.facilityId) ?? 0) + 1); return result;
  };
  const meters = count(input.meters), predictors = count(input.predictors);
  const findings = new Map<string, string[]>();
  if (input.statusState === 'ready') for (const finding of input.findings) {
    if (!isDataFinding(finding)) continue;
    const guid = finding.entity.facilityGuid ?? (finding.entity.kind === 'facility' ? finding.entity.guid : undefined);
    if (guid) findings.set(guid, [...(findings.get(guid) ?? []), finding.description]);
  }
  return views.map(view => ({
    guid: view.facility.guid, name: view.facility.name, icon: 'facility', location: view.location || undefined, route: nav.facilityDataRoute(view.facility.guid, 'meters'),
    status: { tone: view.tone, icon: view.icon, label: view.statusLabel },
    summary: [{ label: 'Meters', value: String(meters.get(view.facility.guid) ?? 0) }, { label: 'Predictors', value: String(predictors.get(view.facility.guid) ?? 0) }],
    details: [fact('Address', [view.facility.address, view.facility.zip].filter(Boolean).join(', ')), fact('Classification', view.facility.classification),
      { label: 'Latest activity', value: view.modified > 0 ? new Date(view.modified).toLocaleDateString('en-US') : 'Not available' },
      { label: 'Findings', value: input.statusState === 'ready' ? `${view.errorCount} errors · ${view.warningCount} warnings` : view.statusLabel }],
    findings: (findings.get(view.facility.guid) ?? []).slice(0, 2),
    detailLink: { label: 'Open facility meters', route: nav.facilityDataRoute(view.facility.guid, 'meters') }
  }));
}
export function meterTiles(views: readonly PortfolioMeterView[], nav: Pick<Navigation, 'facilityDataRoute' | 'facilityMeterRoute'>): PortfolioTile[] {
  return views.map(view => ({ guid: view.meter.guid, name: view.meter.name, icon: view.sourceIcon,
    route: nav.facilityMeterRoute(view.facility.guid, view.meter.guid, 'settings'),
    owner: { label: view.facility.name, route: nav.facilityDataRoute(view.facility.guid, 'meters') }, chip: view.meter.source,
    status: { tone: view.statusTone, icon: view.statusIcon, label: view.statusLabel },
    summary: [{ label: 'Readings', value: String(view.card.readingCount) }, fact('First reading', view.card.firstReadingLabel), fact('Latest reading', view.card.latestReadingLabel)],
    details: [fact('Units', view.meter.startingUnit), fact('Group', view.card.group?.name), fact('Scope', view.card.scopeLabel), ...(view.card.fuelLabel ? [fact('Fuel', view.card.fuelLabel)] : [])],
    findings: (view.card.statusActionSummaries ?? []).slice(0, 2),
    detailLink: { label: 'View quality report', route: nav.facilityMeterRoute(view.facility.guid, view.meter.guid, 'quality') }
  }));
}
export function predictorTiles(entries: readonly PredictorInventoryEntry[], nav: Navigation): PortfolioTile[] {
  return entries.map(entry => ({ guid: entry.guid, name: entry.card.predictor.name, icon: entry.card.icon,
    route: entry.station ? nav.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey) : nav.facilityPredictorRoute(entry.facility.guid, entry.guid, 'settings'),
    owner: { label: entry.facility.name, route: nav.facilityDataRoute(entry.facility.guid, 'predictors') }, chip: entry.chip,
    station: entry.station ? `${entry.station.stationName}${entry.station.needsStationRepair ? ' · Station required' : entry.station.hasConflictingStationNames ? ' · Station names differ' : ''}` : undefined,
    status: entry.status,
    summary: [{ label: 'Readings', value: String(entry.card.readingCount) }, fact('Units', entry.card.unitLabel), fact('First reading', entry.card.firstReadingLabel), fact('Latest reading', entry.card.latestReadingLabel)],
    details: [fact('Type', entry.card.typeLabel), fact('Production', entry.card.productionLabel), ...(entry.station ? [fact('Station ID', entry.station.stationId), fact('Base temperature', entry.card.baseTemperatureLabel)] : []), fact('Description', entry.card.predictor.description)],
    findings: entry.card.statusActionSummaries.slice(0, 2),
    detailLink: entry.station ? { label: 'Open station setup', route: nav.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey) }
      : { label: 'View quality report', route: nav.facilityPredictorRoute(entry.facility.guid, entry.guid, 'quality') }
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

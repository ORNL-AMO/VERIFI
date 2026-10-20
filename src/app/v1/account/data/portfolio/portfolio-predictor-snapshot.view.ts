import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { buildPredictorDataQualityReport, predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import { PredictorInventoryEntry } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { formatPredictorReadingAmount, predictorMonthKey, validPredictorReadingDate } from '@app/v1/facility/data/predictors/models/predictor-reading.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { PortfolioReadingSnapshot, PortfolioRecentReading, PortfolioTileFact, PortfolioTileLink } from './portfolio-inventory.models';
import { portfolioFindingAction } from './portfolio-finding.view';

type Navigation = Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute' | 'facilityWeatherPredictorRoute' | 'facilityWeatherPredictorQualityRoute'>;
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Display saved monthly records without calendarization, weather generation or aggregation. */
export function buildPredictorSnapshots(entries: readonly PredictorInventoryEntry[], readings: readonly IdbPredictorData[], state: StatusEvaluationState, navigation: Navigation): ReadonlyMap<string, PortfolioReadingSnapshot> {
  const byPredictor = new Map<string, IdbPredictorData[]>();
  for (const reading of readings) {
    const items = byPredictor.get(reading.predictorId) ?? [];
    items.push(reading); byPredictor.set(reading.predictorId, items);
  }
  return new Map(entries.map(entry => {
    const saved = (byPredictor.get(entry.guid) ?? []).filter(reading => reading.accountId === entry.card.predictor.accountId && reading.facilityId === entry.facility.guid);
    return [entry.guid, predictorSnapshot(entry, saved, state, navigation)];
  }));
}

function predictorSnapshot(entry: PredictorInventoryEntry, readings: readonly IdbPredictorData[], state: StatusEvaluationState, navigation: Navigation): PortfolioReadingSnapshot {
  const predictor = entry.card.predictor;
  const dated = readings.filter(reading => validPredictorReadingDate(reading) && reading.year <= 9999)
    .sort((a, b) => b.year - a.year || b.month - a.month || a.guid.localeCompare(b.guid));
  const active = state === 'ready' ? entry.card.statusFindings : [];
  const annotations = readingAnnotations(entry, readings, active);
  const unit = predictorDataQualityUnit(predictor);
  const recentReadings: PortfolioRecentReading[] = dated.slice(0, 3).map(reading => {
    const findings = annotations.get(reading) ?? [];
    const tone = findings.some(finding => finding.severity === 'error') ? 'danger' : findings.length ? 'warning' : 'neutral';
    const statusLabel = state === 'error' ? 'Checks unavailable' : state !== 'ready' ? 'Checks pending'
      : tone === 'danger' ? 'Has errors' : tone === 'warning' ? 'Has warnings' : undefined;
    const icon = state === 'error' ? 'info' : state !== 'ready' ? 'loading' : tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : undefined;
    const dateLabel = monthLabel(reading);
    const valueLabel = typeof reading.amount === 'number' && Number.isFinite(reading.amount)
      ? `${formatPredictorReadingAmount(reading.amount)}${unit ? ` ${unit}` : ''}` : 'No value';
    return { guid: reading.guid, dateKey: predictorMonthKey(reading.year, reading.month), dateLabel, quantityLabel: 'Value', valueLabel, tone, statusLabel, icon,
      description: `${dateLabel}. Value: ${valueLabel}${statusLabel ? `. ${statusLabel}` : ''}${findings.length ? `. ${findings.map(finding => finding.title).join('; ')}` : ''}` };
  });
  const findings = active.filter((finding): finding is StatusItem & { severity: 'error' | 'warning' } => finding.severity !== 'information')
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const latest = dated[0], first = dated.at(-1);
  const facts: PortfolioTileFact[] = [
    ...(predictor.description?.trim() ? [{ label: 'Description', value: predictor.description.trim() }] : [])
  ];
  return {
    readingCount: readings.length, invalidDateCount: readings.length - dated.length,
    rangeLabel: first && latest ? first.year === latest.year && first.month === latest.month ? monthLabel(latest) : `${monthLabel(first)} – ${monthLabel(latest)}`
      : readings.length ? 'Reading dates unavailable' : 'No readings yet',
    readingsLink: { label: 'Open readings', route: entry.station
      ? navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey, 'readings')
      : navigation.facilityPredictorRoute(entry.facility.guid, entry.guid, 'readings') },
    recentReadings, facts,
    findings: findings.slice(0, 2).map(finding => ({ id: finding.id, name: predictor.name, title: finding.title, description: finding.description, severity: finding.severity,
      action: findingAction(entry, finding, navigation) })),
    remainingFindings: Math.max(0, findings.length - 2)
  };
}

function findingAction(entry: PredictorInventoryEntry, finding: StatusItem, navigation: Navigation): PortfolioTileLink | undefined {
  const destination = finding.destination;
  if (entry.station && destination.kind === 'predictor-tab') {
    return destination.tab === 'quality'
      ? { label: 'Review quality', route: navigation.facilityWeatherPredictorQualityRoute(entry.facility.guid, entry.station.routeKey, entry.guid) }
      : { label: destination.tab === 'settings' ? 'Open station setup' : 'Review readings', route: navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey, destination.tab === 'settings' ? 'setup' : 'readings') };
  }
  return portfolioFindingAction(finding, navigation);
}

function readingAnnotations(entry: PredictorInventoryEntry, readings: readonly IdbPredictorData[], active: readonly StatusItem[]): ReadonlyMap<IdbPredictorData, StatusItem[]> {
  const annotations = new Map<IdbPredictorData, StatusItem[]>();
  if (!active.length) return annotations;
  const add = (reading: IdbPredictorData, finding: StatusItem) => {
    if (finding.severity === 'information') return;
    const items = annotations.get(reading) ?? []; items.push(finding); annotations.set(reading, items);
  };
  const outlier = active.find(finding => finding.code === 'predictor.quality.outlier');
  const duplicate = active.find(finding => finding.code === 'predictor.data.duplicate-month');
  if (outlier || duplicate) {
    const quality = buildPredictorDataQualityReport(readings, entry.card.predictor);
    if (outlier) for (const row of quality.chartRows) if (row.outlier) add(row.reading, outlier);
    if (duplicate) {
      const months = new Set(quality.duplicateMonths.map(month => month.key));
      for (const reading of readings) if (months.has(predictorMonthKey(reading.year, reading.month))) add(reading, duplicate);
    }
  }
  for (const finding of active) for (const reading of readings) {
    if (finding.code === 'predictor.data.negative' && !entry.card.predictor.canBeNegative && reading.amount < 0) add(reading, finding);
    if (finding.code === 'predictor.weather.warning' && !entry.card.predictor.ignoreWeatherDataWarning && (reading.weatherDataWarning || reading.weatherDataChanged)) add(reading, finding);
  }
  return annotations;
}

function monthLabel(reading: IdbPredictorData): string {
  const date = new Date(0); date.setUTCFullYear(reading.year, reading.month - 1, 1);
  return monthFormatter.format(date);
}

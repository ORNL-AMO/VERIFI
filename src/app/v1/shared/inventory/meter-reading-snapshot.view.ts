import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { formatMeterReadingNumber, isElectricityRecsMeter, meterReadingsTableType } from '@app/v1/facility/data/meters/meter-workbench/readings/meter-workbench-readings.models';
import { InventoryRecentReading, InventoryMeterSnapshot, InventoryTileFact } from './inventory.models';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbFacility } from '@data/models/idbModels/facility';
import { StatusEvaluationState } from '@app/v1/status/status.models';
interface MeterSnapshotEntry {
  readonly meter: IdbUtilityMeter; readonly facility: IdbFacility; readonly evaluation: StatusEvaluationState;
  readonly card: { readonly group?: { readonly guid: string; readonly name: string }; readonly fuelLabel?: string; readonly statusFindings?: readonly StatusItem[] };
}
import { inventoryFindingAction } from './inventory-finding.view';

type SnapshotNavigation = Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute' | 'facilityMeterGroupRoute'>;
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Saved reading records, with active row findings rather than inferred monthly coverage. */
export function buildMeterSnapshots(views: readonly MeterSnapshotEntry[], readings: readonly IdbUtilityMeterData[], navigation: SnapshotNavigation): ReadonlyMap<string, InventoryMeterSnapshot> {
  const byMeter = new Map<string, IdbUtilityMeterData[]>();
  for (const reading of readings) {
    const items = byMeter.get(reading.meterId) ?? [];
    items.push(reading); byMeter.set(reading.meterId, items);
  }
  return new Map(views.map(view => {
    const saved = (byMeter.get(view.meter.guid) ?? []).filter(reading => reading.facilityId === view.facility.guid && reading.accountId === view.meter.accountId);
    return [view.meter.guid, meterSnapshot(view, saved, navigation)];
  }));
}

function meterSnapshot(view: MeterSnapshotEntry, readings: readonly IdbUtilityMeterData[], navigation: SnapshotNavigation): InventoryMeterSnapshot {
  const months = new Set<number>();
  for (const reading of readings) {
    const key = monthIndex(reading.year, reading.month);
    if (key === undefined) continue;
    months.add(key);
  }
  const keys = [...months].sort((a, b) => a - b);
  const latest = keys.at(-1);
  const active = view.evaluation === 'ready' ? view.card.statusFindings ?? [] : [];
  const issues = active.filter((finding): finding is StatusItem & { severity: 'error' | 'warning' } => finding.severity !== 'information')
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1)
      || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const dated = readings.flatMap(reading => {
    const date = readingDate(reading);
    return date ? [{ reading, date }] : [];
  }).sort((a, b) => b.date.getTime() - a.date.getTime() || a.reading.guid.localeCompare(b.reading.guid));
  const annotations = readingAnnotations(view, readings, active);
  const recentReadings: InventoryRecentReading[] = dated.slice(0, 3).map(({ reading, date }) => {
    const findings = annotations.get(reading) ?? [];
    const tone = findings.some(finding => finding.severity === 'error') ? 'danger' : findings.length ? 'warning' : 'neutral';
    const statusLabel = view.evaluation === 'error' ? 'Checks unavailable' : view.evaluation !== 'ready' ? 'Checks pending'
      : tone === 'danger' ? 'Has errors' : tone === 'warning' ? 'Has warnings' : undefined;
    const icon = view.evaluation === 'error' ? 'info' : view.evaluation !== 'ready' ? 'loading'
      : tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : undefined;
    const dateLabel = dateFormatter.format(date);
    const value = readingValue(view, reading);
    return { guid: reading.guid, dateKey: readingDateKey(reading), dateLabel, tone, statusLabel, icon, ...value,
      description: `${dateLabel}. ${value.quantityLabel}: ${value.valueLabel}${statusLabel ? `. ${statusLabel}` : ''}${findings.length ? `. ${findings.map(finding => finding.title).join('; ')}` : ''}` };
  });
  const facts: InventoryTileFact[] = [
    ...(view.meter.source === 'Other Fuels' ? [{ label: 'Fuel', value: view.card.fuelLabel?.trim() || 'Not set' }] : [])
  ];
  return {
    readingCount: readings.length,
    rangeLabel: latest === undefined ? readings.length ? 'Reading dates unavailable' : 'No readings yet'
      : keys[0] === latest ? monthLabel(latest) : `${monthLabel(keys[0])} – ${monthLabel(latest)}`,
    invalidDateCount: readings.length - dated.length,
    readingsLink: { label: 'Open readings', route: navigation.facilityMeterRoute(view.facility.guid, view.meter.guid, 'readings') },
    recentReadings, facts,
    group: { label: 'Meter group', value: view.card.group ? view.card.group.name?.trim() || 'Untitled group' : 'Not assigned',
      route: view.card.group ? navigation.facilityMeterGroupRoute(view.facility.guid, view.card.group.guid, 'monthly-table') : undefined },
    findings: issues.slice(0, 2).map(finding => ({ id: finding.id, name: view.meter.name, title: finding.title,
      description: finding.description, severity: finding.severity, action: inventoryFindingAction(finding, navigation) })),
    remainingFindings: Math.max(0, issues.length - 2)
  };
}

/** Match the workbench's energy/consumption context using saved values and their saved units. */
function readingValue(view: MeterSnapshotEntry, reading: IdbUtilityMeterData): Pick<InventoryRecentReading, 'quantityLabel' | 'valueLabel'> {
  const meter = view.meter;
  const recs = meter.source === 'Electricity' && isElectricityRecsMeter(meter);
  const energy = meterReadingsTableType(meter) !== 'other'
    && (meter.source === 'Other' ? getIsEnergyUnit(meter.startingUnit) : getIsEnergyMeter(meter.source));
  const quantityLabel = recs ? 'RECs' : energy ? 'Energy use' : 'Consumption';
  const value = recs ? reading.RECs : energy ? reading.totalEnergyUse : reading.totalVolume;
  const unit = recs ? 'MWh' : energy ? meter.energyUnit : meter.startingUnit;
  const valueLabel = typeof value === 'number' && Number.isFinite(value)
    ? `${formatMeterReadingNumber(value)} ${typeof unit === 'string' && unit.trim() ? unit.trim() : '(unit not set)'}` : 'No value';
  return { quantityLabel, valueLabel };
}

/** Only active findings flag individual records; meter-wide setup, gaps and currency stay at card level. */
function readingAnnotations(view: MeterSnapshotEntry, readings: readonly IdbUtilityMeterData[], active: readonly StatusItem[]): ReadonlyMap<IdbUtilityMeterData, StatusItem[]> {
  const annotations = new Map<IdbUtilityMeterData, StatusItem[]>();
  const add = (reading: IdbUtilityMeterData, finding: StatusItem) => {
    if (finding.severity === 'information') return;
    const values = annotations.get(reading) ?? [];
    if (!values.some(value => value.id === finding.id)) values.push(finding);
    annotations.set(reading, values);
  };
  const consumption = active.find(finding => finding.code === 'meter.quality.consumption-outlier');
  const cost = active.find(finding => finding.code === 'meter.quality.cost-outlier');
  // Reuse the Quality report's row flags rather than introducing another outlier rule.
  if (consumption || cost) for (const row of buildMeterDataQualityReport(readings, view.meter).chartRows) {
    if (consumption && row.consumptionOutlier) add(row.reading, consumption);
    if (cost && row.costOutlier) add(row.reading, cost);
  }
  for (const finding of active) {
    if (finding.code === 'meter.data.negative' && !view.meter.canBeNegative) {
      for (const reading of readings) if (reading.totalEnergyUse < 0 || (reading.totalVolume !== undefined && reading.totalVolume < 0)) {
        add(reading, finding);
      }
    } else if (finding.code === 'meter.data.duplicate-date') {
      const dates = new Set(evidenceStrings(finding, 'dates'));
      for (const reading of readings) if (dates.has(readingDateKey(reading))) add(reading, finding);
    }
  }
  return annotations;
}

function evidenceStrings(finding: StatusItem, key: string): readonly string[] {
  const value = finding.evidence[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function readingDateKey(reading: IdbUtilityMeterData): string {
  return `${reading.year}-${String(reading.month).padStart(2, '0')}-${String(reading.day).padStart(2, '0')}`;
}
function readingDate(reading: IdbUtilityMeterData): Date | undefined {
  if (monthIndex(reading.year, reading.month) === undefined || !Number.isInteger(reading.day)) return undefined;
  const date = new Date(reading.year, reading.month - 1, reading.day);
  return date.getFullYear() === reading.year && date.getMonth() === reading.month - 1 && date.getDate() === reading.day ? date : undefined;
}
function monthIndex(year: number, month: number): number | undefined {
  return Number.isInteger(year) && year >= 100 && year <= 9999 && Number.isInteger(month) && month >= 1 && month <= 12
    ? year * 12 + month - 1 : undefined;
}
function monthLabel(key: number): string {
  return monthFormatter.format(new Date(Math.floor(key / 12), key % 12, 1));
}

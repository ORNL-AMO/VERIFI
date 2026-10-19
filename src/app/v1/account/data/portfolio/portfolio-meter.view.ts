import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { buildMeterCards, MeterCardView } from '@app/v1/facility/data/meters/models';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';

export type PortfolioMeterStatusFilter = 'all' | 'attention' | 'noReadings' | 'missingGroup' | 'valid';
export type PortfolioMeterSort = 'attention' | 'facilityName' | 'latestReading';

export interface PortfolioMeterView {
  readonly card: MeterCardView;
  readonly meter: IdbUtilityMeter;
  readonly facility: IdbFacility;
  readonly sourceIcon: IconName;
  readonly statusTone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly statusIcon: IconName;
  readonly statusLabel: string;
  readonly searchText: string;
  readonly latestReading: number;
  readonly attentionRank: number;
  readonly noReadings: boolean;
  readonly missingGroup: boolean;
  readonly valid: boolean;
  readonly needsAttention: boolean;
}

export interface PortfolioMeterInput {
  readonly facilities: readonly IdbFacility[];
  readonly meters: readonly IdbUtilityMeter[];
  readonly readings: readonly IdbUtilityMeterData[];
  readonly groups: readonly IdbUtilityMeterGroup[];
  readonly findings: readonly StatusItem[];
  readonly statusState: StatusEvaluationState;
}

export function buildPortfolioMeters(input: PortfolioMeterInput): PortfolioMeterView[] {
  const meters = byFacility(input.meters);
  const readings = byFacility(input.readings);
  const groups = byFacility(input.groups);
  const findings = new Map<string, StatusItem[]>();
  if (input.statusState === 'ready') {
    for (const finding of input.findings) {
      if (finding.entity.kind !== 'meter' || !finding.entity.facilityGuid) continue;
      const items = findings.get(finding.entity.facilityGuid) || [];
      items.push(finding);
      findings.set(finding.entity.facilityGuid, items);
    }
  }
  const latest = new Map<string, number>();
  for (const reading of input.readings) {
    const period = reading.year * 12 + reading.month;
    if (Number.isFinite(period)) latest.set(reading.meterId, Math.max(latest.get(reading.meterId) || 0, period));
  }
  return input.facilities.flatMap(facility => buildMeterCards(
    meters.get(facility.guid) || [], readings.get(facility.guid) || [], groups.get(facility.guid) || [], findings.get(facility.guid) || [], input.statusState === 'ready'
  ).map(card => {
    const noReadings = card.readingCount === 0;
    const missingGroup = !card.group;
    const evaluated = input.statusState === 'ready';
    const statusLabel = !evaluated ? input.statusState === 'error' ? 'Checks unavailable' : 'Checks pending'
      : card.statusTone === 'danger' ? 'Has errors' : card.statusTone === 'warning' ? 'Has warnings' : 'All data valid';
    return {
      card, meter: card.meter, facility, sourceIcon: card.sourceIcon || 'meter',
      statusTone: evaluated && card.statusTone !== 'info' ? card.statusTone || 'neutral' : 'neutral',
      statusIcon: evaluated ? card.statusIcon || 'info' : input.statusState === 'error' ? 'info' : 'loading',
      statusLabel,
      searchText: [card.meter.name, facility.name, card.meter.source, card.group?.name || 'ungrouped', statusLabel, card.statusLabel].join(' ').toLowerCase(),
      latestReading: latest.get(card.meter.guid) || 0,
      attentionRank: meterAttentionRank(card, noReadings, missingGroup),
      noReadings, missingGroup,
      valid: evaluated && card.statusTone === 'success',
      needsAttention: noReadings || missingGroup || card.statusTone === 'warning' || card.statusTone === 'danger'
    };
  }));
}

export function filterPortfolioMeters(meters: readonly PortfolioMeterView[], search: string, status: PortfolioMeterStatusFilter): PortfolioMeterView[] {
  const query = search.trim().toLowerCase();
  return meters.filter(item => (!query || item.searchText.includes(query)) && (
    status === 'attention' ? item.needsAttention
      : status === 'noReadings' ? item.noReadings
      : status === 'missingGroup' ? item.missingGroup
      : status === 'valid' ? item.valid : true
  ));
}

function byFacility<T extends { readonly facilityId: string }>(records: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const items = grouped.get(record.facilityId) || [];
    items.push(record);
    grouped.set(record.facilityId, items);
  }
  return grouped;
}

function meterAttentionRank(card: MeterCardView, noReadings: boolean, missingGroup: boolean): number {
  if (card.statusTone === 'danger') return 0;
  if (noReadings) return 1;
  if (card.statusTone === 'warning') return 2;
  if (missingGroup) return 3;
  if (card.statusTone === 'info') return 4;
  return 5;
}

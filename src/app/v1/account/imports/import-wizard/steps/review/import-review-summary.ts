import { ImportFileKind } from '@data/import/spreadsheet-import.models';
import { ImportMeterReadingSummaryRow } from '@data/import/meter-reading-import-review';
import { ImportPredictorReadingSummaryRow } from '@data/import/predictor-reading-import-review';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type ImportReviewRecordStatus = 'New' | 'Existing';
export type ImportReviewFacilityStatus = ImportReviewRecordStatus | 'Import destination';

export interface ImportReviewReadingActivity {
  readonly kind: 'new' | 'update';
  readonly count: number;
  readonly start?: Date;
  readonly end?: Date;
  readonly singlePeriod: boolean;
  readonly dateFormat: 'MMM d, y' | 'MMM y';
}

export interface ImportReviewRecordSummary {
  readonly guid: string;
  readonly name: string;
  readonly status: ImportReviewRecordStatus;
}

export interface ImportReviewMeterSummary extends ImportReviewRecordSummary {
  readonly source: string;
  readonly unitLabel: string;
  readonly readingActivity: readonly ImportReviewReadingActivity[];
}

export interface ImportReviewPredictorSummary extends ImportReviewRecordSummary {
  readonly typeLabel: string;
  readonly typeDetail?: string;
  readonly unit?: string;
  readonly production: boolean;
  readonly readingActivity: readonly ImportReviewReadingActivity[];
}

export interface ImportReviewEquipmentSummary extends ImportReviewRecordSummary {}

export interface ImportReviewEnergyUseGroupSummary extends ImportReviewRecordSummary {
  readonly equipment: readonly ImportReviewEquipmentSummary[];
}

export interface ImportReviewOmissionSummary {
  readonly keptMeterReadings: number;
  readonly excludedMeterReadings: number;
  readonly keptPredictorReadings: number;
  readonly excludedPredictorReadings: number;
  readonly hasItems: boolean;
}

export interface ImportReviewFacilitySummary {
  readonly facility: IdbFacility;
  readonly status: ImportReviewFacilityStatus;
  readonly meters: readonly ImportReviewMeterSummary[];
  readonly predictors: readonly ImportReviewPredictorSummary[];
  readonly energyUseGroups: readonly ImportReviewEnergyUseGroupSummary[];
  readonly omissions: ImportReviewOmissionSummary;
}

export interface ImportReviewOverviewItem {
  readonly key: 'facilities' | 'meters' | 'meterReadings' | 'predictors' |
  'predictorReadings' | 'energyUseGroups' | 'equipment';
  readonly label: string;
  readonly count: number;
  readonly icon: IconName;
}

export interface ImportReviewSummary {
  readonly overview: readonly ImportReviewOverviewItem[];
  readonly facilities: readonly ImportReviewFacilitySummary[];
}

export interface ImportReviewMeterRowInput {
  readonly meter: IdbUtilityMeter;
  readonly unitLabel: string;
}

export interface ImportReviewPredictorRowInput {
  readonly predictor: IdbPredictor;
  readonly typeLabel: string;
  readonly typeDetail?: string;
}

export interface BuildImportReviewSummaryOptions {
  readonly kind: ImportFileKind;
  readonly selectedFacilityId?: string;
  readonly facilities: readonly IdbFacility[];
  readonly meterRows: readonly ImportReviewMeterRowInput[];
  readonly meterReadingRows: readonly ImportMeterReadingSummaryRow[];
  readonly predictorRows: readonly ImportReviewPredictorRowInput[];
  readonly predictorReadingRows: readonly ImportPredictorReadingSummaryRow[];
  readonly energyUseGroups: readonly IdbFacilityEnergyUseGroup[];
  readonly equipment: readonly IdbFacilityEnergyUseEquipment[];
}

export function buildImportReviewSummary(options: BuildImportReviewSummaryOptions): ImportReviewSummary {
  const includedMeters = options.meterRows.filter(row => !row.meter.skipImport);
  const includedPredictors = options.predictorRows.filter(row => !row.predictor.skipImport);
  const meterReadingsById = new Map(options.meterReadingRows.map(row => [row.meter.guid, row]));
  const predictorReadingsById = new Map(options.predictorReadingRows.map(row => [row.predictor.guid, row]));
  const facilities = reviewFacilities(options, includedMeters, includedPredictors);

  const facilitySummaries = facilities.map(facility => {
    const meterRows = includedMeters.filter(row => row.meter.facilityId === facility.guid);
    const predictorRows = includedPredictors.filter(row => row.predictor.facilityId === facility.guid);
    const meters = meterRows.map(row => meterSummary(row, meterReadingsById.get(row.meter.guid)));
    const predictors = predictorRows.map(row => predictorSummary(row, predictorReadingsById.get(row.predictor.guid)));
    const energyUseGroups = options.energyUseGroups
      .filter(group => group.facilityId === facility.guid)
      .map(group => energyUseGroupSummary(group, options.equipment));
    const omissions = omissionSummary(
      meterRows.map(row => meterReadingsById.get(row.meter.guid)).filter(isPresent),
      predictorRows.map(row => predictorReadingsById.get(row.predictor.guid)).filter(isPresent)
    );

    return {
      facility,
      status: options.kind === 'footprint-tool'
        ? 'Import destination' as const
        : recordStatus(facility),
      meters,
      predictors,
      energyUseGroups,
      omissions
    };
  });

  const meterReadings = facilitySummaries.reduce((total, facility) => total + facility.meters.reduce(
    (facilityTotal, meter) => facilityTotal + activityCount(meter.readingActivity), 0), 0);
  const predictorReadings = facilitySummaries.reduce((total, facility) => total + facility.predictors.reduce(
    (facilityTotal, predictor) => facilityTotal + activityCount(predictor.readingActivity), 0), 0);
  const meters = facilitySummaries.reduce((total, facility) => total + facility.meters.length, 0);
  const predictors = facilitySummaries.reduce((total, facility) => total + facility.predictors.length, 0);
  const energyUseGroups = facilitySummaries.reduce((total, facility) => total + facility.energyUseGroups.length, 0);
  const equipment = facilitySummaries.reduce((total, facility) => total + facility.energyUseGroups.reduce(
    (facilityTotal, group) => facilityTotal + group.equipment.length, 0), 0);
  const overview: ImportReviewOverviewItem[] = [
    { key: 'facilities', label: 'Facilities affected', count: facilitySummaries.length, icon: 'facility' },
    { key: 'meters', label: 'Meters', count: meters, icon: 'meter' },
    { key: 'meterReadings', label: 'Meter readings', count: meterReadings, icon: 'calendar' },
    { key: 'predictors', label: 'Predictors', count: predictors, icon: 'predictor' },
    { key: 'predictorReadings', label: 'Predictor readings', count: predictorReadings, icon: 'chartLine' },
    { key: 'energyUseGroups', label: 'Energy-use groups', count: energyUseGroups, icon: 'meterGroup' },
    { key: 'equipment', label: 'Equipment', count: equipment, icon: 'tools' }
  ];

  return {
    overview: overview.filter(item => item.count > 0),
    facilities: facilitySummaries
  };
}

function reviewFacilities(
  options: BuildImportReviewSummaryOptions,
  meters: readonly ImportReviewMeterRowInput[],
  predictors: readonly ImportReviewPredictorRowInput[]
): IdbFacility[] {
  if (options.kind === 'footprint-tool') {
    return options.facilities.filter(facility => facility.guid === options.selectedFacilityId);
  }
  if (options.kind !== 'general-workbook') return [...options.facilities];

  const affectedFacilityIds = new Set([
    ...meters.map(row => row.meter.facilityId),
    ...predictors.map(row => row.predictor.facilityId),
    ...options.energyUseGroups.map(group => group.facilityId),
    ...options.equipment.map(item => item.facilityId)
  ]);
  return options.facilities.filter(facility => affectedFacilityIds.has(facility.guid));
}

function meterSummary(
  row: ImportReviewMeterRowInput,
  readings?: ImportMeterReadingSummaryRow
): ImportReviewMeterSummary {
  return {
    guid: row.meter.guid,
    name: row.meter.name || 'Unnamed meter',
    status: recordStatus(row.meter),
    source: row.meter.source || 'Source not specified',
    unitLabel: row.unitLabel || 'Unit not specified',
    readingActivity: readingActivity(readings, 'MMM d, y')
  };
}

function predictorSummary(
  row: ImportReviewPredictorRowInput,
  readings?: ImportPredictorReadingSummaryRow
): ImportReviewPredictorSummary {
  return {
    guid: row.predictor.guid,
    name: row.predictor.name || 'Unnamed predictor',
    status: recordStatus(row.predictor),
    typeLabel: row.typeLabel,
    typeDetail: row.typeDetail,
    unit: row.predictor.unit,
    production: row.predictor.production,
    readingActivity: readingActivity(readings, 'MMM y')
  };
}

function readingActivity(
  readings: Pick<ImportMeterReadingSummaryRow | ImportPredictorReadingSummaryRow,
  'newReadings' | 'existingReadings' | 'keepExisting'> | undefined,
  dateFormat: ImportReviewReadingActivity['dateFormat']
): ImportReviewReadingActivity[] {
  if (!readings) return [];
  const activities: ImportReviewReadingActivity[] = [];
  if (readings.newReadings.count > 0) {
    activities.push(activity('new', readings.newReadings, dateFormat));
  }
  if (!readings.keepExisting && readings.existingReadings.count > 0) {
    activities.push(activity('update', readings.existingReadings, dateFormat));
  }
  return activities;
}

function activity(
  kind: ImportReviewReadingActivity['kind'],
  range: { readonly count: number; readonly start?: Date; readonly end?: Date },
  dateFormat: ImportReviewReadingActivity['dateFormat']
): ImportReviewReadingActivity {
  return {
    kind,
    count: range.count,
    start: range.start,
    end: range.end,
    singlePeriod: !!range.start && !!range.end && range.start.getTime() === range.end.getTime(),
    dateFormat
  };
}

function energyUseGroupSummary(
  group: IdbFacilityEnergyUseGroup,
  equipment: readonly IdbFacilityEnergyUseEquipment[]
): ImportReviewEnergyUseGroupSummary {
  return {
    guid: group.guid,
    name: group.name || 'Unnamed energy-use group',
    status: recordStatus(group),
    equipment: equipment
      .filter(item => item.energyUseGroupId === group.guid)
      .map(item => ({
        guid: item.guid,
        name: item.name || 'Unnamed equipment',
        status: recordStatus(item)
      }))
  };
}

function omissionSummary(
  meterRows: readonly ImportMeterReadingSummaryRow[],
  predictorRows: readonly ImportPredictorReadingSummaryRow[]
): ImportReviewOmissionSummary {
  const keptMeterReadings = meterRows.reduce((total, row) =>
    total + (row.keepExisting ? row.existingReadings.count : 0), 0);
  const excludedMeterReadings = meterRows.reduce((total, row) =>
    total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
  const keptPredictorReadings = predictorRows.reduce((total, row) =>
    total + (row.keepExisting ? row.existingReadings.count : 0), 0);
  const excludedPredictorReadings = predictorRows.reduce((total, row) =>
    total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
  return {
    keptMeterReadings,
    excludedMeterReadings,
    keptPredictorReadings,
    excludedPredictorReadings,
    hasItems: keptMeterReadings + excludedMeterReadings + keptPredictorReadings + excludedPredictorReadings > 0
  };
}

function recordStatus(record: { readonly id?: number }): ImportReviewRecordStatus {
  return record.id == null ? 'New' : 'Existing';
}

function activityCount(activities: readonly ImportReviewReadingActivity[]): number {
  return activities.reduce((total, activityItem) => total + activityItem.count, 0);
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}

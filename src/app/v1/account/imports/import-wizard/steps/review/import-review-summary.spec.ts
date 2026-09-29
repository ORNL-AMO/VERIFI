import { ImportMeterReadingSummaryRow } from '@data/import/meter-reading-import-review';
import { ImportPredictorReadingSummaryRow } from '@data/import/predictor-reading-import-review';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import {
  BuildImportReviewSummaryOptions,
  buildImportReviewSummary,
  ImportReviewMeterRowInput,
  ImportReviewPredictorRowInput
} from './import-review-summary';

describe('buildImportReviewSummary', () => {
  it('groups named records by facility and counts only readings that will be written', () => {
    const plant = facility('plant', 'Main Plant', 1);
    const warehouse = facility('warehouse', 'Warehouse');
    const facilityOnly = facility('facility-only', 'Facility settings only', 3);
    const electricity = meter('electricity', plant.guid, 2);
    const skippedMeter = meter('skipped-meter', plant.guid, undefined, true);
    const water = meter('water', warehouse.guid);
    const production = predictor('production', plant.guid, 4);
    const summary = buildImportReviewSummary(options({
      facilities: [plant, warehouse, facilityOnly],
      meterRows: [meterRow(electricity), meterRow(skippedMeter), meterRow(water)],
      meterReadingRows: [meterReadings(electricity, {
        newCount: 2,
        existingCount: 3,
        keepExisting: true,
        excludedInvalidCount: 1
      })],
      predictorRows: [predictorRow(production)],
      predictorReadingRows: [predictorReadings(production, {
        existingCount: 2,
        excludedInvalidCount: 1
      })]
    }));

    expect(summary.facilities.map(item => item.facility.name)).toEqual([
      'Main Plant', 'Warehouse', 'Facility settings only'
    ]);
    expect(summary.facilities[0].meters.map(item => item.name)).toEqual(['Electricity']);
    expect(summary.facilities[0].meters[0].readingActivity).toEqual([
      expect.objectContaining({ kind: 'new', count: 2, singlePeriod: false })
    ]);
    expect(summary.facilities[0].predictors[0]).toMatchObject({
      name: 'Production', status: 'Existing', production: true,
      readingActivity: [expect.objectContaining({ kind: 'update', count: 2 })]
    });
    expect(summary.facilities[0].omissions).toEqual({
      keptMeterReadings: 3,
      excludedMeterReadings: 1,
      keptPredictorReadings: 0,
      excludedPredictorReadings: 1,
      hasItems: true
    });
    expect(summary.facilities[1].meters[0]).toMatchObject({
      name: 'Water', status: 'New', readingActivity: []
    });
    expect(summary.facilities[2]).toMatchObject({ meters: [], predictors: [], energyUseGroups: [] });
    expect(overviewCounts(summary)).toEqual({
      facilities: 3,
      meters: 2,
      meterReadings: 2,
      predictors: 1,
      predictorReadings: 2
    });
  });

  it('includes only referenced facilities for a general workbook', () => {
    const used = facility('used', 'Used facility', 1);
    const unused = facility('unused', 'Unused facility', 2);
    const summary = buildImportReviewSummary(options({
      kind: 'general-workbook',
      facilities: [used, unused],
      meterRows: [meterRow(meter('meter-a', used.guid))]
    }));

    expect(summary.facilities.map(item => item.facility.guid)).toEqual([used.guid]);
    expect(overviewCounts(summary)).toMatchObject({ facilities: 1, meters: 1 });
  });

  it('shows the selected footprint destination with energy-use groups and equipment', () => {
    const first = facility('first', 'First facility', 1);
    const selected = facility('selected', 'Selected facility', 2);
    const group = {
      id: 8,
      guid: 'group-a',
      accountId: 'account-1',
      facilityId: selected.guid,
      name: 'Process heating'
    } as IdbFacilityEnergyUseGroup;
    const boiler = {
      guid: 'equipment-a',
      accountId: 'account-1',
      facilityId: selected.guid,
      energyUseGroupId: group.guid,
      name: 'Boiler'
    } as IdbFacilityEnergyUseEquipment;
    const summary = buildImportReviewSummary(options({
      kind: 'footprint-tool',
      selectedFacilityId: selected.guid,
      facilities: [first, selected],
      energyUseGroups: [group],
      equipment: [boiler]
    }));

    expect(summary.facilities).toHaveLength(1);
    expect(summary.facilities[0]).toMatchObject({
      facility: selected,
      status: 'Import destination',
      energyUseGroups: [{
        name: 'Process heating',
        status: 'Existing',
        equipment: [{ name: 'Boiler', status: 'New' }]
      }]
    });
    expect(overviewCounts(summary)).toEqual({ facilities: 1, energyUseGroups: 1, equipment: 1 });
  });

  it('returns an empty presentation when no general-workbook records are included', () => {
    const summary = buildImportReviewSummary(options({
      kind: 'general-workbook',
      facilities: [facility('unused', 'Unused facility', 1)]
    }));

    expect(summary).toEqual({ overview: [], facilities: [] });
  });
});

function options(overrides: Partial<BuildImportReviewSummaryOptions> = {}): BuildImportReviewSummaryOptions {
  return {
    kind: 'verifi-v3',
    selectedFacilityId: undefined,
    facilities: [],
    meterRows: [],
    meterReadingRows: [],
    predictorRows: [],
    predictorReadingRows: [],
    energyUseGroups: [],
    equipment: [],
    ...overrides
  };
}

function facility(guid: string, name: string, id?: number): IdbFacility {
  return { id, guid, name, accountId: 'account-1', color: '#286090' } as IdbFacility;
}

function meter(guid: string, facilityId: string, id?: number, skipImport = false): IdbUtilityMeter {
  return {
    id,
    guid,
    facilityId,
    accountId: 'account-1',
    name: guid === 'water' ? 'Water' : guid === 'electricity' ? 'Electricity' : guid,
    source: guid === 'water' ? 'Water Intake' : 'Electricity',
    startingUnit: guid === 'water' ? 'gal' : 'kWh',
    skipImport
  } as IdbUtilityMeter;
}

function meterRow(value: IdbUtilityMeter): ImportReviewMeterRowInput {
  return { meter: value, unitLabel: value.startingUnit };
}

function predictor(guid: string, facilityId: string, id?: number): IdbPredictor {
  return {
    id,
    guid,
    facilityId,
    accountId: 'account-1',
    name: 'Production',
    unit: 'tons',
    predictorType: 'Standard',
    production: true,
    skipImport: false
  } as IdbPredictor;
}

function predictorRow(value: IdbPredictor): ImportReviewPredictorRowInput {
  return { predictor: value, typeLabel: 'Standard' };
}

function meterReadings(
  value: IdbUtilityMeter,
  counts: { newCount?: number; existingCount?: number; keepExisting?: boolean; excludedInvalidCount?: number }
): ImportMeterReadingSummaryRow {
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 1, 1);
  return {
    meterIndex: 0,
    meter: value,
    facilityName: '',
    primaryUnit: value.startingUnit,
    newReadings: { count: counts.newCount ?? 0, start, end },
    existingReadings: { count: counts.existingCount ?? 0, start, end: start },
    invalidReadings: { count: counts.excludedInvalidCount ?? 0 },
    comparisons: [],
    keepExisting: counts.keepExisting ?? false,
    invalidReadingDetails: Array.from({ length: counts.excludedInvalidCount ?? 0 }, (_, index) => ({
      index,
      key: `invalid-meter-${index}`,
      reading: {} as never,
      dateLabel: '',
      messages: [],
      excluded: true
    }))
  };
}

function predictorReadings(
  value: IdbPredictor,
  counts: { newCount?: number; existingCount?: number; keepExisting?: boolean; excludedInvalidCount?: number }
): ImportPredictorReadingSummaryRow {
  const start = new Date(2026, 0, 1);
  return {
    predictorIndex: 0,
    predictor: value,
    facilityName: '',
    unit: value.unit,
    newReadings: { count: counts.newCount ?? 0, start, end: start },
    existingReadings: { count: counts.existingCount ?? 0, start, end: start },
    invalidReadings: { count: counts.excludedInvalidCount ?? 0 },
    comparisons: [],
    keepExisting: counts.keepExisting ?? false,
    invalidReadingDetails: Array.from({ length: counts.excludedInvalidCount ?? 0 }, (_, index) => ({
      index,
      key: `invalid-predictor-${index}`,
      reading: {} as never,
      monthLabel: '',
      messages: [],
      excluded: true
    }))
  };
}

function overviewCounts(summary: ReturnType<typeof buildImportReviewSummary>): Record<string, number> {
  return Object.fromEntries(summary.overview.map(item => [item.key, item.count]));
}

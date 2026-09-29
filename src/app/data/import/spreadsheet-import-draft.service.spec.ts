import * as XLSX from 'xlsx';
import { getEmptyFileReference, ImportFileDraft } from './spreadsheet-import.models';
import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { SpreadsheetImportDraftService } from './spreadsheet-import-draft.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

describe('SpreadsheetImportDraftService', () => {
  const service = new SpreadsheetImportDraftService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any
  );

  it('detects all supported VERIFI template families', () => {
    expect(service.detectVersion(['Help', 'Facilities', 'Meters-Utilities', 'Electricity', 'Non-electricity', 'Predictors'])).toBe('V1');
    expect(service.detectVersion([
      'V2', 'Help', 'HIDE_Lists', 'HIDE_Meter_Lists', 'Facilities', 'Meters-Utilities',
      'HIDE_Meters-Utilites', 'Electricity', 'Stationary Fuel - Other Energy', 'Mobile Fuel',
      'Water', 'Other Utility - Emission', 'Predictors', 'Fix Me', 'HIDE_NAICS3'
    ])).toBe('V2');
    expect(service.detectVersion([
      'V2', 'Getting Started', 'HIDE_Lists', 'HIDE_Meter_Lists', 'Facilities', 'Meters-Utilities',
      'HIDE_Meters-Utilites', 'Electricity', 'Stationary Fuel - Other Energy', 'Mobile Fuel',
      'Water', 'Other Utility - Emission', 'Predictors', 'Troubleshooting', 'HIDE_NAICS3'
    ])).toBe('V2');
    expect(service.detectVersion(['Instructions', 'ETH VERIFI Upload'])).toBe('ETH');
    expect(service.detectVersion(['V3', 'Facilities'])).toBe('V3');
  });

  it('distinguishes footprint files from general workbooks', () => {
    expect(service.detectVersion(['Main', 'Energy Consumption', 'Energy Uses', 'Relevant Variables'])).toBe('Footprint-tool');
    expect(service.detectVersion(['Usage Data'])).toBe('Non-template');
  });

  it('excludes hidden worksheets unless they are explicitly requested', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Date'], ['2025-01-01']]), 'Visible');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Lookup']]), 'Hidden');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Lookup']]), 'Very Hidden');
    workbook.Workbook = {
      Sheets: [
        { name: 'Visible', Hidden: 0 },
        { name: 'Hidden', Hidden: 1 },
        { name: 'Very Hidden', Hidden: 2 }
      ]
    };

    expect(service.visibleWorksheetNames(workbook)).toEqual(['Visible']);
    expect(service.visibleWorksheetNames(workbook, true)).toEqual(['Visible', 'Hidden', 'Very Hidden']);
  });

  it('replaces a meter and retargets readings and import decisions without losing source identity', () => {
    const parser = {
      getUtilityMeterData: vi.fn((_workbook, meters) => [reading({ meterId: meters[0].guid })])
    };
    const draftService = new SpreadsheetImportDraftService(
      { meterData: () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      parser as any,
      {} as any,
      {} as any,
      {} as any
    );
    const original = meter({
      guid: 'import-meter',
      meterNumber: 'WORKBOOK-17',
      importWizardName: 'WORKBOOK-17',
      skipImport: false
    });
    const replacement = meter({ id: 9, guid: 'existing-meter', meterNumber: 'LIVE-42' });
    const draft = importDraft('verifi-v2', {
      meters: [original],
      meterData: [reading({ guid: 'old-reading', meterId: original.guid })],
      skipExistingReadingsMeterIds: [original.guid],
      excludedMeterReadingIds: ['old-reading']
    });

    draftService.replaceMeter(draft, original.guid, replacement);

    expect(draft.meters[0]).toEqual(expect.objectContaining({
      id: 9,
      guid: replacement.guid,
      meterNumber: replacement.meterNumber,
      importWizardName: original.importWizardName,
      skipImport: false
    }));
    expect(parser.getUtilityMeterData).toHaveBeenCalledWith(
      draft.workbook,
      [expect.objectContaining({ guid: replacement.guid, meterNumber: original.importWizardName })]
    );
    expect(draft.meterData[0]).toEqual(expect.objectContaining({
      guid: 'old-reading',
      meterId: replacement.guid
    }));
    expect(draft.skipExistingReadingsMeterIds).toEqual([replacement.guid]);
    expect(draft.excludedMeterReadingIds).toEqual(['old-reading:0']);
  });

  it('preserves the selected occurrence when duplicate meter readings are rebuilt', () => {
    const parser = {
      getUtilityMeterData: vi.fn((_workbook, meters) => [
        reading({ guid: 'rebuilt-a', meterId: meters[0].guid }),
        reading({ guid: 'rebuilt-b', meterId: meters[0].guid })
      ])
    };
    const draftService = new SpreadsheetImportDraftService(
      { meterData: () => [] } as any,
      {} as any, {} as any, {} as any, parser as any, {} as any, {} as any, {} as any
    );
    const original = meter({ guid: 'import-meter', meterNumber: 'WORKBOOK-17', importWizardName: 'WORKBOOK-17' });
    const replacement = meter({ id: 9, guid: 'existing-meter', meterNumber: 'LIVE-42' });
    const draft = importDraft('verifi-v2', {
      meters: [original],
      meterData: [
        reading({ id: 21, guid: 'old-a', meterId: original.guid }),
        reading({ id: 22, guid: 'old-b', meterId: original.guid })
      ],
      excludedMeterReadingIds: ['22:1']
    });

    draftService.replaceMeter(draft, original.guid, replacement);

    expect(draft.meterData.map(value => value.guid)).toEqual(['old-a', 'old-b']);
    expect(draft.excludedMeterReadingIds).toEqual(['22:1']);
  });

  it('materializes general predictors without overwriting reviewed meters', () => {
    const draftService = new SpreadsheetImportDraftService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any
    );
    const reviewedMeter = meter({ guid: 'reviewed-meter', name: 'Reviewed name' });
    const draft = importDraft('general-workbook', { meters: [reviewedMeter] });

    draftService.materializeGeneralPredictors(draft);

    expect(draft.meters).toEqual([reviewedMeter]);
  });

  it('replaces a predictor and remaps imported readings to existing Weather data as overrides', () => {
    const existingReading = predictorReading({
      id: 42, guid: 'existing-reading', predictorId: 'weather-a', year: 2026, month: 1
    });
    const draftService = new SpreadsheetImportDraftService(
      { predictorData: () => [existingReading] } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any
    );
    const original = predictor({ guid: 'import-a', importWizardName: 'HDD workbook column' });
    const weather = predictor({
      id: 7, guid: 'weather-a', predictorType: 'Weather', weatherStationId: 'KORD',
      weatherStationName: 'Chicago O’Hare', heatingBaseTemperature: 60
    });
    const draft = importDraft('verifi-v3', {
      predictors: [original],
      predictorData: [predictorReading({ predictorId: original.guid, year: 2026, month: 1, amount: 18 })],
      skipExistingPredictorIds: [original.guid],
      excludedPredictorReadingIds: ['predictor-reading-a']
    });

    draftService.replacePredictor(draft, original.guid, weather);

    expect(draft.predictors[0]).toEqual(expect.objectContaining({
      id: 7,
      guid: weather.guid,
      importWizardName: original.importWizardName
    }));
    expect(draft.predictorData[0]).toEqual(expect.objectContaining({
      id: existingReading.id,
      guid: existingReading.guid,
      predictorId: weather.guid,
      amount: 18,
      weatherOverride: true,
      weatherDataWarning: false,
      weatherDataChanged: false
    }));
    expect(draft.skipExistingPredictorIds).toEqual([weather.guid]);
    expect(draft.excludedPredictorReadingIds).toEqual([`${existingReading.id}:0`]);
  });

  it('preserves an automatically matched Weather predictor and treats workbook values as overrides', () => {
    const weather = predictor({
      id: 7, guid: 'weather-a', name: 'HDD 60', predictorType: 'Weather', weatherStationId: 'KORD',
      weatherStationName: 'Chicago O’Hare', heatingBaseTemperature: 60
    });
    const existingReading = predictorReading({
      id: 42, guid: 'existing-reading', predictorId: weather.guid, year: 2026, month: 1, amount: 10
    });
    const draftService = new SpreadsheetImportDraftService(
      {
        account: () => ({ guid: 'account-a' }),
        predictors: () => [weather],
        predictorData: () => [existingReading]
      } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any
    );
    const draft = importDraft('general-workbook', {
      importFacilities: [{ guid: 'facility-a', accountId: 'account-a', name: 'Plant' } as any],
      columnGroups: [{
        id: 'date-group', groupLabel: 'Date', groupItems: [{ id: 'date-column', index: 0, value: 'Date' }]
      }],
      predictorFacilityGroups: [{
        facilityId: 'facility-a', facilityName: 'Plant', color: '',
        groupItems: [{ id: 'predictor-column', index: 1, value: 'HDD 60' }]
      }],
      headerMap: [{ Date: '2026-01-01T12:00:00', 'HDD 60': 18 }]
    });

    draftService.materializeGeneralPredictors(draft);

    expect(draft.predictors[0]).toEqual(expect.objectContaining({
      guid: weather.guid,
      predictorType: 'Weather',
      importWizardName: 'HDD 60'
    }));
    expect(draft.predictorData[0]).toEqual(expect.objectContaining({
      guid: existingReading.guid,
      amount: 18,
      weatherOverride: true,
      weatherDataWarning: false,
      weatherDataChanged: false
    }));
  });
});

function importDraft(kind: ImportFileDraft['kind'], values: Partial<ImportFileDraft> = {}): ImportFileDraft {
  return {
    ...getEmptyFileReference(),
    id: 'draft-1',
    name: 'test.xlsx',
    workbook: XLSX.utils.book_new(),
    kind,
    status: 'ready',
    findings: [],
    completedSteps: [],
    invalidMeterReadingsAcknowledged: false,
    excludedMeterReadingIds: [],
    skipExistingPredictorIds: [],
    invalidPredictorReadingsAcknowledged: false,
    excludedPredictorReadingIds: [],
    ...values
  };
}

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', importWizardName: 'Production', production: false, productionInAnalysis: false,
    predictorType: 'Standard', weatherDataType: 'HDD', weatherStationId: '', weatherStationName: '',
    ...overrides
  } as IdbPredictor;
}

function predictorReading(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'predictor-reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: 2026, month: 1, amount: 10, weatherOverride: false, weatherDataWarning: true,
    weatherDataChanged: true, ...overrides
  } as IdbPredictorData;
}

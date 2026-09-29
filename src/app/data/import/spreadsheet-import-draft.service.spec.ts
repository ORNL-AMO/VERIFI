import * as XLSX from 'xlsx';
import { getEmptyFileReference, ImportFileDraft } from './spreadsheet-import.models';
import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { SpreadsheetImportDraftService } from './spreadsheet-import-draft.service';

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
    workbook.Workbook = { Sheets: [{ name: 'Visible', Hidden: 0 }, { name: 'Hidden', Hidden: 1 }] };

    expect(service.visibleWorksheetNames(workbook)).toEqual(['Visible']);
    expect(service.visibleWorksheetNames(workbook, true)).toEqual(['Visible', 'Hidden']);
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
    expect(draft.excludedMeterReadingIds).toEqual(['old-reading']);
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
    ...values
  };
}

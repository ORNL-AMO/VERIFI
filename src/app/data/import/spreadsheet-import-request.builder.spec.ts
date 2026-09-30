import { getEmptyFileReference, ImportFileDraft } from './spreadsheet-import.models';
import {
  buildSpreadsheetImportCommitRequest,
  hasSpreadsheetImportRecords
} from './spreadsheet-import-request.builder';

describe('spreadsheet import request builder', () => {
  it('filters skipped records and remaps index-qualified exclusions', () => {
    const draft = importDraft({
      meters: [meter('skipped', true), meter('included', false)],
      meterData: [reading('skipped', 'first'), reading('included', 'second')],
      excludedMeterReadingIds: ['second:1']
    });

    const request = buildSpreadsheetImportCommitRequest(draft, 'account-a');

    expect(request.meters.map(value => value.guid)).toEqual(['included']);
    expect(request.meterReadings.map(value => value.guid)).toEqual(['second']);
    expect(request.excludedMeterReadingIds).toEqual(['second:0']);
  });

  it('includes only referenced general-workbook facilities and detects an empty request', () => {
    const draft = importDraft({
      importFacilities: [facility('facility-a'), facility('facility-b')],
      meters: [meter('included', false, 'facility-b')]
    });

    const request = buildSpreadsheetImportCommitRequest(draft, 'account-a');
    expect(request.facilities.map(value => value.guid)).toEqual(['facility-b']);
    expect(hasSpreadsheetImportRecords(request)).toBe(true);

    const empty = buildSpreadsheetImportCommitRequest(importDraft(), 'account-a');
    expect(hasSpreadsheetImportRecords(empty)).toBe(false);
  });
});

function importDraft(overrides: Partial<ImportFileDraft> = {}): ImportFileDraft {
  return {
    ...getEmptyFileReference(),
    id: 'draft-a',
    kind: 'general-workbook',
    status: 'ready',
    findings: [],
    completedSteps: [],
    invalidMeterReadingsAcknowledged: false,
    excludedMeterReadingIds: [],
    skipExistingPredictorIds: [],
    invalidPredictorReadingsAcknowledged: false,
    excludedPredictorReadingIds: [],
    ...overrides
  };
}

function facility(guid: string): any {
  return { guid, accountId: 'account-a', name: guid };
}

function meter(guid: string, skipImport: boolean, facilityId = 'facility-a'): any {
  return { guid, accountId: 'account-a', facilityId, skipImport };
}

function reading(meterId: string, guid: string): any {
  return { guid, meterId, accountId: 'account-a', facilityId: 'facility-a', year: 2026, month: 1, day: 1 };
}

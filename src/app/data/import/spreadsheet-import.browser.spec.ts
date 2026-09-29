import * as XLSX from 'xlsx';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { SpreadsheetImportCommandService } from './spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from './spreadsheet-import-draft.service';
import { ImportCommitRequest } from './spreadsheet-import.models';

describe('spreadsheet import browser boundaries', () => {
  let harness: IndexedDbTestHarness;
  let transactionService: IndexedDbTransactionService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('spreadsheet-import');
    transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: { ...dbConfig, name: harness.databaseName }
    });
  });

  afterEach(async () => harness.destroy());

  it('reads a real browser File and initializes a general-workbook draft', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Date', 'Electricity (kWh)'], ['2025-01-01', 100]
    ]), 'Usage');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([bytes], 'usage.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const service = new SpreadsheetImportDraftService(
      { facilities: () => [] } as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any
    );

    const draft = await service.readFile(file);

    expect(draft.kind).toBe('general-workbook');
    expect(draft.selectedWorksheetName).toBe('Usage');
    expect(draft.headerMap).toHaveLength(1);
  });

  it('commits every participating import store together', async () => {
    const service = commandService();
    await service.commit(request());
    await harness.reopen();

    expect(await harness.getAll('facilities')).toContainEqual(expect.objectContaining({ guid: 'facility-import' }));
    expect(await harness.getAll('utilityMeter')).toContainEqual(expect.objectContaining({ guid: 'meter-import', visible: true }));
    expect(await harness.getAll('utilityMeterData')).toContainEqual(expect.objectContaining({ guid: 'reading-import' }));
  });

  it('rolls back earlier import writes when a later write fails', async () => {
    const service = commandService();
    const failing = request();
    (failing.meterReadings[0] as any).cannotClone = () => 'failure';

    await expect(service.commit(failing)).rejects.toBeDefined();
    await harness.reopen();

    expect(await harness.getAll('facilities')).not.toContainEqual(expect.objectContaining({ guid: 'facility-import' }));
    expect(await harness.getAll('utilityMeter')).not.toContainEqual(expect.objectContaining({ guid: 'meter-import' }));
    expect(await harness.getAll('utilityMeterData')).not.toContainEqual(expect.objectContaining({ guid: 'reading-import' }));
  });

  function commandService(): SpreadsheetImportCommandService {
    const boundary = {
      execute: async (options: any, persist: () => Promise<any>) => ({ value: await persist(), change: options })
    };
    return new SpreadsheetImportCommandService(
      boundary as any,
      { account: () => ({ guid: 'account-import' }) } as any,
      transactionService
    );
  }

  function request(): ImportCommitRequest {
    const timestamp = new Date('2025-01-01T00:00:00Z');
    return {
      accountGuid: 'account-import', draftId: 'draft-import', kind: 'general-workbook',
      facilities: [{ guid: 'facility-import', accountId: 'account-import', name: 'Imported facility', createdDate: timestamp, modifiedDate: timestamp } as any],
      meterGroups: [],
      meters: [{ guid: 'meter-import', facilityId: 'facility-import', accountId: 'account-import', name: 'Electricity', createdDate: timestamp, modifiedDate: timestamp } as any],
      meterReadings: [{ guid: 'reading-import', meterId: 'meter-import', facilityId: 'facility-import', accountId: 'account-import', year: 2025, month: 1, day: 1, totalEnergyUse: 100, createdDate: timestamp, modifiedDate: timestamp } as any],
      predictors: [], predictorReadings: [], energyUseGroups: [], energyUseEquipment: [],
      skipExistingReadingsMeterIds: [], skipExistingPredictorFacilityIds: [],
      excludedMeterReadingIds: [], invalidMeterReadingsAcknowledged: false
    };
  }
});

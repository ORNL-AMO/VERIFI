import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IdbFacility } from '@data/models/idbModels/facility';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { UploadDataEnergyTreasureHuntService } from './parsers/upload-data-energy-treasure-hunt.service';
import { UploadDataFootprintToolService } from './parsers/upload-data-footprint-tool.service';
import { UploadDataSharedFunctionsService } from './parsers/upload-data-shared-functions.service';
import { UploadDataV1Service } from './parsers/upload-data-v1.service';
import { UploadDataV2Service } from './parsers/upload-data-v2.service';
import { UploadDataV3Service } from './parsers/upload-data-v3.service';
import { SpreadsheetImportCommandService } from './spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from './spreadsheet-import-draft.service';
import { buildSpreadsheetImportCommitRequest } from './spreadsheet-import-request.builder';
import { ImportCommitRequest } from './spreadsheet-import.models';

describe('spreadsheet import browser boundaries', () => {
  let harness: IndexedDbTestHarness | undefined;
  let transactionService: IndexedDbTransactionService;
  let workspaceFacilities: IdbFacility[];
  let draftService: SpreadsheetImportDraftService;

  beforeEach(() => {
    harness = undefined;
    workspaceFacilities = [];
    const account = {
      guid: 'account-import', name: 'Import account', country: 'US', energyUnit: 'MMBtu', electricityUnit: 'kWh',
      volumeLiquidUnit: 'gal', volumeGasUnit: 'CCF', massUnit: 'lb', unitsOfMeasure: 'Imperial',
      energyIsSource: false, fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true
    };
    const store = {
      account: () => account,
      facilities: () => workspaceFacilities,
      selectedFacility: () => workspaceFacilities[0],
      meters: () => [], meterGroups: () => [], meterData: () => [],
      predictors: () => [], predictorData: () => [], customFuels: () => [], customGWPs: () => []
    };
    const query = {
      getAccountMetersCopy: () => [], getAccountMeterGroupsCopy: () => [],
      getFacilityEnergyUseGroups: () => [], getFacilityEnergyUseEquipment: () => []
    };
    TestBed.configureTestingModule({
      providers: [
        SpreadsheetImportDraftService,
        EnergyUnitsHelperService,
        UploadDataSharedFunctionsService,
        UploadDataV1Service,
        UploadDataV2Service,
        UploadDataV3Service,
        UploadDataEnergyTreasureHuntService,
        UploadDataFootprintToolService,
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: AccountWorkspaceQueryService, useValue: query },
        { provide: EGridService, useValue: { subRegionsByZipcode: [] } }
      ]
    });
    draftService = TestBed.inject(SpreadsheetImportDraftService);
  });

  afterEach(async () => {
    if (harness) await harness.destroy();
    harness = undefined;
  });

  it('reads a real browser File and initializes a general-workbook draft', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Date', 'Electricity (kWh)'], ['2025-01-01', 100]
    ]), 'Usage');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([bytes], 'usage.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const draft = await draftService.readFile(file);

    expect(draft.kind).toBe('general-workbook');
    expect(draft.selectedWorksheetName).toBe('Usage');
    expect(draft.headerMap).toHaveLength(1);
  });

  it('persists a real general workbook through the default-facility mapping path', async () => {
    workspaceFacilities = [{
      guid: 'facility-default',
      accountId: 'account-import',
      name: 'Default Plant',
      color: '#123456',
      energyUnit: 'MMBtu',
      electricityUnit: 'kWh',
      volumeLiquidUnit: 'gal',
      volumeGasUnit: 'CCF',
      massUnit: 'lb'
    } as IdbFacility, {
      guid: 'facility-other',
      accountId: 'account-import',
      name: 'Other Plant',
      color: '#654321',
      energyUnit: 'MMBtu',
      electricityUnit: 'kWh',
      volumeLiquidUnit: 'gal',
      volumeGasUnit: 'CCF',
      massUnit: 'lb'
    } as IdbFacility];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Date', 'Electricity (kWh)'],
      ['2026-01-01', 100]
    ]), 'Usage');
    const draft = await draftService.readFile(workbookFile(workbook, 'general-default.xlsx'));
    const meterColumn = draft.columnGroups
      .find(group => group.groupLabel === 'Worksheet Columns')!
      .groupItems.find(item => item.value === 'Electricity (kWh)')!;

    draftService.setGeneralWorkbookDefaultFacility(draft, 'facility-default');
    draftService.assignColumn(draft, meterColumn.id, 'Meters');
    draftService.initializeFacilityMappings(draft);
    draft.meters.forEach(meter => meter.meterReadingDataApplication = 'backward');
    const request = buildSpreadsheetImportCommitRequest(draft, 'account-import');

    await initializeHarness();
    await commandService().commit(request);
    await harness!.reopen();

    const facilities = await harness!.getAll('facilities');
    const meters = await harness!.getAll('utilityMeter');
    const readings = await harness!.getAll('utilityMeterData');
    expect(facilities).toContainEqual(expect.objectContaining({ guid: 'facility-default' }));
    expect(meters).toHaveLength(1);
    expect(meters[0]).toEqual(expect.objectContaining({
      facilityId: 'facility-default',
      accountId: 'account-import'
    }));
    expect(readings).toHaveLength(1);
    expect(readings[0]).toEqual(expect.objectContaining({
      meterId: meters[0].guid,
      facilityId: 'facility-default',
      accountId: 'account-import',
      year: 2026,
      month: 1,
      day: 1
    }));
  });

  it('materializes representative V1 facility, meter, and reading records from a browser File', async () => {
    const draft = await draftService.readFile(workbookFile(v1Workbook(), 'verifi-v1.xlsx'));

    expect(draft.kind).toBe('verifi-v1');
    expect(draft.importFacilities).toHaveLength(1);
    expect(draft.importFacilities[0].name).toBe('V1 Plant');
    expect(draft.meters).toHaveLength(1);
    expect(draft.meters[0]).toMatchObject({ meterNumber: 'V1-ELEC', name: 'V1 Electricity', source: 'Electricity' });
    expect(draft.meterData).toHaveLength(1);
    expect(draft.meterData[0]).toMatchObject({ totalEnergyUse: 123, year: 2025, month: 1, day: 15 });
  });

  it('materializes representative V2 facility, meter, and reading records from a browser File', async () => {
    const draft = await draftService.readFile(workbookFile(v2Workbook(), 'verifi-v2.xlsx'));

    expect(draft.kind).toBe('verifi-v2');
    expect(draft.importFacilities).toHaveLength(1);
    expect(draft.importFacilities[0].name).toBe('V2 Plant');
    expect(draft.meters).toHaveLength(1);
    expect(draft.meters[0]).toMatchObject({ meterNumber: 'V2-ELEC', name: 'V2 Electricity', source: 'Electricity' });
    expect(draft.meterData).toHaveLength(1);
    expect(draft.meterData[0]).toMatchObject({ totalEnergyUse: 456, year: 2025, month: 2, day: 15 });
  });

  it('materializes and assigns representative footprint equipment from a browser File', async () => {
    workspaceFacilities = [{
      guid: 'facility-footprint', accountId: 'account-import', name: 'Footprint Plant', color: '#123456',
      energyUnit: 'MMBtu', electricityUnit: 'kWh', volumeLiquidUnit: 'gal', volumeGasUnit: 'CCF', massUnit: 'lb'
    } as IdbFacility];

    const draft = await draftService.readFile(workbookFile(footprintWorkbook(), 'footprint.xlsx'));

    expect(draft.kind).toBe('footprint-tool');
    expect(draft.selectedFacilityId).toBe('facility-footprint');
    expect(draft.facilityEnergyUseGroups).toHaveLength(1);
    expect(draft.facilityEnergyUseGroups[0]).toMatchObject({ name: 'Process equipment', facilityId: 'facility-footprint' });
    expect(draft.facilityEnergyUseEquipment).toHaveLength(1);
    expect(draft.facilityEnergyUseEquipment[0]).toMatchObject({
      name: 'Air compressor', facilityId: 'facility-footprint',
      operatingConditionsData: [{ year: 2026, hoursOfOperation: 4000, loadFactor: 50, dutyFactor: 80, efficiency: 100 }]
    });
  });

  it('rejects a malformed V2 browser File that contains no facilities', async () => {
    const workbook = v2Workbook();
    workbook.Sheets['Facilities'] = XLSX.utils.aoa_to_sheet([['Facility Name']]);

    await expect(draftService.readFile(workbookFile(workbook, 'malformed-v2.xlsx')))
      .rejects.toBe('No Facilities Found!');
  });

  it('commits every participating import store together', async () => {
    await initializeHarness();
    const service = commandService();
    await service.commit(request());
    await harness!.reopen();

    expect(await harness!.getAll('facilities')).toContainEqual(expect.objectContaining({ guid: 'facility-import' }));
    expect(await harness!.getAll('utilityMeter')).toContainEqual(expect.objectContaining({ guid: 'meter-import', visible: true }));
    expect(await harness!.getAll('utilityMeterData')).toContainEqual(expect.objectContaining({ guid: 'reading-import' }));
  });

  it('rolls back earlier import writes when a later write fails', async () => {
    await initializeHarness();
    const service = commandService();
    const failing = request();
    (failing.meterReadings[0] as any).cannotClone = () => 'failure';

    await expect(service.commit(failing)).rejects.toBeDefined();
    await harness!.reopen();

    expect(await harness!.getAll('facilities')).not.toContainEqual(expect.objectContaining({ guid: 'facility-import' }));
    expect(await harness!.getAll('utilityMeter')).not.toContainEqual(expect.objectContaining({ guid: 'meter-import' }));
    expect(await harness!.getAll('utilityMeterData')).not.toContainEqual(expect.objectContaining({ guid: 'reading-import' }));
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

  async function initializeHarness(): Promise<void> {
    TestBed.resetTestingModule();
    harness = await IndexedDbTestHarness.create('spreadsheet-import');
    transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: { ...dbConfig, name: harness.databaseName }
    });
  }

  function request(): ImportCommitRequest {
    const timestamp = new Date('2025-01-01T00:00:00Z');
    return {
      accountGuid: 'account-import', draftId: 'draft-import', kind: 'general-workbook',
      facilities: [{ guid: 'facility-import', accountId: 'account-import', name: 'Imported facility', createdDate: timestamp, modifiedDate: timestamp } as any],
      meterGroups: [],
      meters: [{
        guid: 'meter-import', facilityId: 'facility-import', accountId: 'account-import',
        name: 'Electricity', source: 'Electricity', startingUnit: 'kWh', energyUnit: 'MMBtu',
        meterReadingDataApplication: 'backward', createdDate: timestamp, modifiedDate: timestamp
      } as any],
      meterReadings: [{ guid: 'reading-import', meterId: 'meter-import', facilityId: 'facility-import', accountId: 'account-import', year: 2025, month: 1, day: 1, totalEnergyUse: 100, createdDate: timestamp, modifiedDate: timestamp } as any],
      predictors: [], predictorReadings: [], energyUseGroups: [], energyUseEquipment: [],
      skipExistingReadingsMeterIds: [], skipExistingPredictorIds: [],
      excludedMeterReadingIds: [], invalidMeterReadingsAcknowledged: false,
      excludedPredictorReadingIds: [], invalidPredictorReadingsAcknowledged: false
    };
  }

  function workbookFile(workbook: XLSX.WorkBook, name: string): File {
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new File([bytes], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function v1Workbook(): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    appendSheet(workbook, 'Help');
    appendSheet(workbook, 'Facilities', [
      ['Facility Name', 'Country', 'State', 'Zip'],
      ['V1 Plant', 'United States', 'TN', '37830']
    ]);
    appendSheet(workbook, 'Meters-Utilities', [
      ['Facility Name', 'Meter Number', 'Meter Name', 'Source', 'Collection Unit', 'Calendarize Data?'],
      ['V1 Plant', 'V1-ELEC', 'V1 Electricity', 'Electricity', 'kWh', 'No']
    ]);
    appendSheet(workbook, 'Electricity', [
      ['Meter Number', 'Read Date', 'Total Consumption'],
      ['V1-ELEC', new Date(2025, 0, 15, 12), 123]
    ]);
    appendSheet(workbook, 'Non-electricity', [['Meter Number', 'Read Date', 'Total Consumption']]);
    appendSheet(workbook, 'Predictors', [['Facility Name', 'Date']]);
    return workbook;
  }

  function v2Workbook(): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    const sheets: Array<[string, unknown[][]?]> = [
      ['V2'], ['Help'], ['HIDE_Lists'], ['HIDE_Meter_Lists'],
      ['Facilities', [
        ['Facility Name', 'Country', 'State', 'Zip'],
        ['V2 Plant', 'United States', 'TN', '37830']
      ]],
      ['Meters-Utilities', [
        ['Facility Name', 'Meter Number (unique)', 'Meter Name (Display)', 'Source', 'Scope', 'Collection Unit', 'Calendarize Data?'],
        ['V2 Plant', 'V2-ELEC', 'V2 Electricity', 'Electricity', 'Scope 2', 'kWh', 'No']
      ]],
      ['HIDE_Meters-Utilites'],
      ['Electricity', [
        ['Meter Number', 'Read Date', 'Total Consumption'],
        ['V2-ELEC', new Date(2025, 1, 15, 12), 456]
      ]],
      ['Stationary Fuel - Other Energy', [['Meter Number', 'Read Date']]],
      ['Mobile Fuel', [['Meter Number', 'Read Date']]],
      ['Water', [['Meter Number', 'Read Date']]],
      ['Other Utility - Emission', [['Meter Number', 'Read Date']]],
      ['Predictors', [['Facility Name', 'Date']]],
      ['Fix Me'], ['HIDE_NAICS3']
    ];
    sheets.forEach(([name, rows]) => appendSheet(workbook, name, rows));
    return workbook;
  }

  function footprintWorkbook(): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    const main = XLSX.utils.aoa_to_sheet([]);
    setCell(main, 'K13', 2026);
    setCell(main, 'K14', 1);
    XLSX.utils.book_append_sheet(workbook, main, 'Main');
    appendSheet(workbook, 'Energy Consumption');
    const energyUses = XLSX.utils.aoa_to_sheet([]);
    setCell(energyUses, 'D21', 'Process equipment');
    setCell(energyUses, 'C26', 'Air compressor');
    setCell(energyUses, 'F26', 'Electricity');
    setCell(energyUses, 'G26', 100);
    setCell(energyUses, 'H26', 'Kilowatts');
    setCell(energyUses, 'BL26', 4000);
    setCell(energyUses, 'BM26', 0.5);
    setCell(energyUses, 'BN26', 0.8);
    XLSX.utils.book_append_sheet(workbook, energyUses, 'Energy Uses');
    appendSheet(workbook, 'Relevant Variables');
    return workbook;
  }

  function appendSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][] = [['']]): void {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }

  function setCell(worksheet: XLSX.WorkSheet, address: string, value: string | number): void {
    XLSX.utils.sheet_add_aoa(worksheet, [[value]], { origin: address });
  }
});

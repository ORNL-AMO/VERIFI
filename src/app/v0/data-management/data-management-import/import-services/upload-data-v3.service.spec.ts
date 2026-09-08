import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ExportToExcelTemplateV3Service } from '@shared/helper-services/export-to-excel-template-v3.service';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { EditMeterFormService } from '@v0/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { UploadDataSharedFunctionsService } from '@v0/data-management/data-management-import/import-services/upload-data-shared-functions.service';
import { UploadDataV3Service } from '@v0/data-management/data-management-import/import-services/upload-data-v3.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

describe('UploadDataV3Service', () => {
  let service: UploadDataV3Service;
  let account: IdbAccount;
  let facilities: Array<IdbFacility>;

  beforeEach(() => {
    account = getNewIdbAccount();
    account.guid = 'account-a';
    account.energyUnit = 'MMBtu';
    account.electricityUnit = 'kWh';
    account.volumeLiquidUnit = 'gal';
    account.volumeGasUnit = 'SCF';
    account.massUnit = 'lb';
    facilities = [];

    TestBed.configureTestingModule({
      providers: [
        UploadDataV3Service,
        ExportToExcelTemplateV3Service,
        { provide: AccountWorkspaceQueryService, useValue: {} },
        { provide: AccountWorkspaceStore, useValue: { facilities: () => facilities } },
        { provide: LoadingService, useValue: {} },
        { provide: EGridService, useValue: { subRegionsByZipcode: [] } },
        { provide: EditMeterFormService, useValue: { setMultipliers: (meter: IdbUtilityMeter) => meter } },
        { provide: UploadDataSharedFunctionsService, useValue: {} }
      ]
    });

    service = TestBed.inject(UploadDataV3Service);
  });

  it('imports the current U.S. State header and normalizes country and state values', () => {
    const stateInputs = ['TN', 'Tennessee', 'TENNESSEE'];

    stateInputs.forEach(stateInput => {
      const facilities = service.getImportFacilities(buildFacilitiesWorkbook('U.S. State', stateInput), account);

      expect(facilities[0].country).toBe('US');
      expect(facilities[0].state).toBe('TENNESSEE');
    });
  });

  it('imports the legacy US State header', () => {
    const facilities = service.getImportFacilities(buildFacilitiesWorkbook('US State', 'TN'), account);

    expect(facilities[0].state).toBe('TENNESSEE');
  });

  it('updates existing charges instead of duplicating them', () => {
    const meter = {
      charges: [
        {
          guid: 'charge-a',
          name: 'Demand Charge',
          chargeType: 'demand',
          displayChargeInTable: true,
          displayUsageInTable: true
        }
      ]
    } as IdbUtilityMeter;

    service.addCharges({
      'Charge 1 Name': 'Demand Charge',
      'Charge 1 Type': 'Flat Fee'
    }, meter);

    expect(meter.charges.length).toBe(1);
    expect(meter.charges[0].chargeType).toBe('flatFee');
  });

  it('round trips exported facility state and country through the V3 parser', async () => {
    facilities = [{
      guid: 'facility-a',
      accountId: account.guid,
      name: 'Plant 1',
      address: '1 Main St',
      country: 'US',
      state: 'TN',
      city: 'Knoxville',
      zip: '37932',
      energyUnit: 'MMBtu'
    } as IdbFacility];
    const exportService = TestBed.inject(ExportToExcelTemplateV3Service);
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(readTemplateArrayBuffer());
    exportService.setFacilityWorksheet(workbook);
    const exportedTemplateBuffer = await workbook.xlsx.writeBuffer();
    const parsedWorkbook = XLSX.read(toArrayBuffer(exportedTemplateBuffer), { type: 'array' });
    const importFacilities = service.getImportFacilities(parsedWorkbook, account);

    expect(importFacilities[0].country).toBe('US');
    expect(importFacilities[0].state).toBe('TENNESSEE');
  });

  function buildFacilitiesWorkbook(stateHeader: string, stateValue: string): XLSX.WorkBook {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Facility Setup'],
      [
        'Facility Name',
        'Address',
        'Country',
        stateHeader,
        'City',
        'ZIP Code',
        'NAICS Code (2-digit)',
        'NAICS Code (3-digit)',
        'Contact Name',
        'Contact Phone',
        'Contact Email'
      ],
      [
        'Plant 1',
        '1 Main St',
        'United States of America (the)',
        stateValue,
        'Knoxville',
        '37932',
        undefined,
        undefined,
        'Alex',
        '555-0100',
        'alex@example.com'
      ]
    ]);

    return {
      SheetNames: ['Facilities'],
      Sheets: {
        Facilities: worksheet
      }
    };
  }

  function readTemplateArrayBuffer(): ArrayBuffer {
    const buffer = readFileSync(join(process.cwd(), 'src/assets/csv_templates/VERIFI-Import-Data.xlsx'));
    return toArrayBuffer(buffer);
  }

  function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer as ArrayBuffer;
  }
});

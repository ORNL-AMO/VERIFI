import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ExportToExcelTemplateV3Service } from '@shared/helper-services/export-to-excel-template-v3.service';

describe('ExportToExcelTemplateV3Service', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('writes charges past the BZ column boundary without throwing', () => {
    TestBed.configureTestingModule({
      providers: [
        ExportToExcelTemplateV3Service,
        { provide: AccountWorkspaceQueryService, useValue: {} },
        { provide: AccountWorkspaceStore, useValue: {} },
        { provide: LoadingService, useValue: {} }
      ]
    });

    const service = TestBed.inject(ExportToExcelTemplateV3Service);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Electricity Meters');
    const meter = {
      charges: [
        { name: 'Demand Charge', chargeType: 'demand' },
        { name: 'Service Fee', chargeType: 'flatFee' }
      ]
    } as any;

    expect(() => service.addChargesToWorksheet(worksheet, 'BY', 3, meter)).not.toThrow();
    expect(worksheet.getCell('BY3').value).toBe('Demand Charge');
    expect(worksheet.getCell('BZ3').value).toBe('Demand');
    expect(worksheet.getCell('CA3').value).toBe('Service Fee');
    expect(worksheet.getCell('CB3').value).toBe('Flat Fee');
  });

  it('exports stored facility country and state values as template labels', () => {
    TestBed.configureTestingModule({
      providers: [
        ExportToExcelTemplateV3Service,
        { provide: AccountWorkspaceQueryService, useValue: {} },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            facilities: () => [{
              guid: 'facility-a',
              name: 'Plant 1',
              address: '1 Main St',
              country: 'US',
              state: 'TN',
              city: 'Knoxville',
              zip: '37932'
            }]
          }
        },
        { provide: LoadingService, useValue: {} }
      ]
    });

    const service = TestBed.inject(ExportToExcelTemplateV3Service);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Facilities');

    service.setFacilityWorksheet(workbook);

    expect(worksheet.getCell('C3').value).toBe('United States of America (the)');
    expect(worksheet.getCell('D3').value).toBe('TENNESSEE');
  });
});

import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { UploadDataV3Service } from '@data/import/parsers/upload-data-v3.service';
import { UploadDataSharedFunctionsService } from '@data/import/parsers/upload-data-shared-functions.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { ExportToExcelTemplateV3Service } from '@shared/helper-services/export-to-excel-template-v3.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { account, facility } from '@app/v1/data/meters/facility-meters.testing';
import { MeterSettingsFormService } from './meter-settings-form.service';

describe('Meter settings file identifier compatibility', () => {
  afterEach(() => TestBed.resetTestingModule());

  it.each([12345, '00012345', 'UTIL-A42'])('retains %s across import, editing, workbook export, and reimport', async accountNumber => {
    const owner = account(), plant = facility({ energyUnit: 'MMBtu', electricityUnit: 'kWh' });
    let meters: IdbUtilityMeter[] = [];
    TestBed.configureTestingModule({ providers: [
      { provide: AccountWorkspaceStore, useValue: { account: () => owner, facilities: () => [plant], meterGroups: () => [] } },
      { provide: AccountWorkspaceQueryService, useValue: {
        getAccountMetersCopy: () => [], getAccountMeterGroupsCopy: () => [], getMetersForExport: () => meters
      } },
      { provide: LoadingService, useValue: {} }, { provide: EGridService, useValue: {} },
      UploadDataSharedFunctionsService, UploadDataV3Service, ExportToExcelTemplateV3Service
    ] });
    const headers = ['Facility Name', 'Meter Number (UNIQUE)', 'Meter Name (DISPLAY)', 'Meter Group (ANALYSIS)',
      'Calendarize Readings?', 'Unit (USAGE)', 'Unit (DEMAND)', 'Site to Source', 'Agreement Type', 'Retain RECs?',
      'Account #', 'Supplier', 'Location', 'Notes'];
    const input = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(input, XLSX.utils.aoa_to_sheet([
      ['Electricity meters'], headers, [plant.name, 'electric-a', 'Imported electric', '', 'Yes', 'kWh', 'kW', 3, '', 'No', accountNumber]
    ]), 'Electricity Meters');
    const parser = TestBed.inject(UploadDataV3Service);
    const imported = parser.getElectricityMeters(input, [plant], owner, [], []).meters[0];
    expect(imported.accountNumber).toBe(accountNumber);
    const forms = TestBed.inject(MeterSettingsFormService), form = forms.buildMeterSettingsForm(imported);
    form.controls.name.setValue('Renamed electric');
    meters = [forms.updateMeterFromSettingsForm(imported, form)];
    const output = new ExcelJS.Workbook(), sheet = output.addWorksheet('Electricity Meters');
    sheet.addRow(['Electricity meters']); sheet.addRow(headers);
    TestBed.inject(ExportToExcelTemplateV3Service).setElectricityMetersWorksheet(output);
    const bytes = await output.xlsx.writeBuffer();
    const reimport = XLSX.read(bytes, { type: 'buffer' });
    const restored = parser.getElectricityMeters(reimport, [plant], owner, [], []).meters[0];
    expect(restored.accountNumber).toBe(accountNumber);
    expect(restored.name).toBe('Renamed electric');
  });
});

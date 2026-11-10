import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'fs';
import * as ExcelJS from 'exceljs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { energyUseItem, energyUseSource, energyUsesSnapshot } from '@app/v1/data/energy-uses/energy-uses.testing';
import { ENERGY_USES_HEADERS, ENERGY_USES_SHEET } from './energy-uses-excel-format';
import { EnergyUsesExcelExportService, getEnergyUsesExportYears, prepareEnergyUsesExportData } from './energy-uses-excel-export.service';

function template(): Promise<ExcelJS.Workbook> {
  const bytes = readFileSync('src/assets/csv_templates/VERIFI-Energy-Uses-Template.xlsx');
  const workbook = new ExcelJS.Workbook();
  return workbook.xlsx.load(Uint8Array.from(bytes).buffer).then(() => workbook);
}

describe('Energy Uses saved-row export', () => {
  it('exports explicit values including zero, without carrying amounts or including foreign equipment', () => {
    const snapshot = energyUsesSnapshot([
      energyUseItem({ guid: 'explicit', utilityData: [energyUseSource({ units: 'kJh', energySource: 'Natural Gas' })] }),
      energyUseItem({ guid: 'conditions-only', operatingConditionsData: [{ year: 2025, hoursOfOperation: 10, loadFactor: 100, dutyFactor: 100, efficiency: 100 }] }),
      energyUseItem({ guid: 'foreign', accountId: 'another-account' })
    ]);
    const before = structuredClone(snapshot);
    expect(getEnergyUsesExportYears(snapshot.energyUseEquipment)).toEqual([2024, 2025]);
    const year2024 = prepareEnergyUsesExportData(snapshot, 2024, new Set(['facility-a']));
    expect(year2024.rows).toHaveLength(2);
    expect(year2024.rows[0][12]).toBe('kJ/hr');
    expect(year2024.rows[0][14]).toBe(0);
    const year2025 = prepareEnergyUsesExportData(snapshot, 2025, new Set(['facility-a']));
    expect(year2025.rows).toHaveLength(1);
    expect(year2025.rows[0][6]).toBe(10);
    expect(year2025.rows[0][14]).toBeNull();
    expect(prepareEnergyUsesExportData(snapshot, 2024, new Set(['facility-b'])).rows).toEqual([]);
    expect(snapshot).toEqual(before);
  });

  it('blocks the complete workbook for more than two included utilities', async () => {
    const store = new AccountWorkspaceStore();
    store.publish(energyUsesSnapshot([energyUseItem({ utilityData: [energyUseSource(), energyUseSource(), energyUseSource()] })]));
    TestBed.configureTestingModule({ providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const exporter = TestBed.inject(EnergyUsesExcelExportService);
    const data = exporter.prepareExportData(2024, new Set(['facility-a']));
    expect(data.hasExcessUtilityTypes).toBe(true);
    await expect(exporter.createExport(data)).rejects.toThrow('more than two');
  });
});

describe('Energy Uses original workbook fidelity', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('retains workbook structure, original styles, validations, and table through serialization', async () => {
    const workbook = await template();
    const sheet = workbook.getWorksheet(ENERGY_USES_SHEET)!;
    const original = { sheets: workbook.worksheets.map(sheet => [sheet.name, sheet.state]),
      views: structuredClone(workbook.views), widths: sheet.columns.map(column => column.width),
      style: structuredClone(sheet.getCell('G2').style), validation: structuredClone(sheet.getCell('G2').dataValidation) };
    const exporter = TestBed.inject(EnergyUsesExcelExportService);
    const values = ['Plant', 'Group', 'Pump', 'Pump', '', '', 0, 100, 100, 90, 'Electricity', 1, 'kW', 1, 0, 'kWh'];
    exporter.fillWorkbook(workbook, { year: 2024, rows: [values], hasExcessUtilityTypes: false });
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const actual = reopened.getWorksheet(ENERGY_USES_SHEET)!;
    expect(reopened.worksheets.map(sheet => [sheet.name, sheet.state])).toEqual(original.sheets);
    expect(reopened.views).toEqual(original.views);
    expect(actual.columns.map(column => column.width)).toEqual(original.widths);
    expect((actual.getRow(1).values as ExcelJS.CellValue[]).slice(1)).toEqual(ENERGY_USES_HEADERS);
    expect(actual.getCell('G2').value).toBe(0);
    expect(actual.getCell('G2').style).toEqual(original.style);
    expect(actual.getCell('G2').dataValidation).toEqual(original.validation);
    expect(actual.getTable('EnergyUses')).toBeDefined();
  });

  it('extends the template table beyond its reserved rows and rejects nonfinite values', async () => {
    const workbook = await template();
    const sheet = workbook.getWorksheet(ENERGY_USES_SHEET)!;
    const reserved = sheet.rowCount;
    const rows = Array.from({ length: reserved + 2 }, (_, index) => ['Plant', 'Group', `Pump ${index}`, 'Pump', '', '', 0]);
    const exporter = TestBed.inject(EnergyUsesExcelExportService);
    exporter.fillWorkbook(workbook, { year: 2024, rows, hasExcessUtilityTypes: false });
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const actual = reopened.getWorksheet(ENERGY_USES_SHEET)!;
    expect(actual.getCell(reserved + 3, 3).value).toBe(`Pump ${reserved + 1}`);
    expect(actual.getCell(reserved + 3, 13).dataValidation).toEqual(sheet.getCell('M2').dataValidation);
    expect(actual.getCell(reserved + 3, 13).style).toEqual(sheet.getCell('M2').style);
    expect((actual.getTable('EnergyUses') as unknown as { model: { tableRef: string } }).model.tableRef).toBe(`A1:V${reserved + 3}`);
    expect(() => exporter.fillWorkbook(workbook, { year: 2024, rows: [[Infinity]], hasExcessUtilityTypes: false })).toThrow('nonfinite');
  });
});

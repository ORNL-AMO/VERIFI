import * as XLSX from 'xlsx';
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
});

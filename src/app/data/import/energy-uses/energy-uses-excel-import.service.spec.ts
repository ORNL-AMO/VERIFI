import * as XLSX from 'xlsx';
import { ENERGY_USES_HEADERS, ENERGY_USES_SHEET, energyUsesMaximumHours, energyUsesNumberError, parseEnergyUsesNumber } from '@shared/energy-uses-excel/energy-uses-excel-format';
import { isEnergyUsesTemplateWorkbook, parseEnergyUsesWorkbook } from './energy-uses-excel-import.service';

function workbook(row: unknown[] = ['Plant', 'Group', 'Pump', 'Pump']): XLSX.WorkBook {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([ENERGY_USES_HEADERS, row]), ENERGY_USES_SHEET);
  return book;
}

describe('Energy Uses standalone workbook parsing', () => {
  it('recognizes the template signature without intercepting general Energy Uses sheets', () => {
    const book = workbook();
    expect(isEnergyUsesTemplateWorkbook(book)).toBe(true);
    const generic = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(generic, XLSX.utils.aoa_to_sheet([['Date', 'Energy'], ['2025-01-01', 10]]), ENERGY_USES_SHEET);
    expect(isEnergyUsesTemplateWorkbook(generic)).toBe(false);
    XLSX.utils.book_append_sheet(generic, XLSX.utils.aoa_to_sheet([['Template overview']]), 'OVERVIEW');
    XLSX.utils.book_append_sheet(generic, XLSX.utils.aoa_to_sheet([['Template instructions']]), 'Instructions');
    expect(isEnergyUsesTemplateWorkbook(generic)).toBe(true);
    expect(() => parseEnergyUsesWorkbook(generic, 'data.xlsx')).toThrow('22 template headers');
  });
  it('retains row numbers and infers only an unambiguous filename year', () => {
    const book = workbook();
    expect(parseEnergyUsesWorkbook(book, 'VERIFI-Energy-Uses-2025.xlsx')).toMatchObject({ year: 2025, rows: [{ importedRow: 2 }] });
    expect(parseEnergyUsesWorkbook(book, '2024-2025.xlsx').year).toBeNull();
    expect(parseEnergyUsesWorkbook(book, 'Energy Uses.xlsx').year).toBeNull();
  });
  it('rejects malformed headers, wrong file types, and empty workbooks', () => {
    const book = workbook();
    book.Sheets[ENERGY_USES_SHEET]['A1'].v = 'Wrong header';
    expect(() => parseEnergyUsesWorkbook(book, 'data.xlsx')).toThrow('22 template headers');
    expect(() => parseEnergyUsesWorkbook(workbook(), 'data.xls')).toThrow('.xlsx');
    const empty = workbook([]);
    expect(() => parseEnergyUsesWorkbook(empty, 'data.xlsx')).toThrow('no equipment rows');
  });
  it('marks formulas, booleans, dates, and Excel errors as row errors', () => {
    const book = workbook();
    for (const [address, cell] of Object.entries({ B2: { t: 'n', v: 5, f: '1+4' }, C2: { t: 'b', v: true },
      D2: { t: 'd', v: new Date() }, E2: { t: 'e', v: 7 } })) book.Sheets[ENERGY_USES_SHEET][address] = cell;
    expect(parseEnergyUsesWorkbook(book, 'data.xlsx').rows[0].errors).toHaveLength(4);
  });
});

describe('Energy Uses numeric compatibility', () => {
  it.each([['0', 0], [' +1.5 ', 1.5], ['.5', .5], [null, undefined], ['', undefined]])('parses %s as a plain decimal', (input, value) => {
    expect(parseEnergyUsesNumber(input)).toBe(value);
  });
  it.each(['1,000', '50%', '1e3', Infinity, NaN, true])('rejects ambiguous or nonfinite value %s', input => {
    expect(() => parseEnergyUsesNumber(input)).toThrow();
  });
  it('validates leap-year hours, factors, efficiency, and integer counts', () => {
    expect(energyUsesMaximumHours(2024)).toBe(8784);
    expect(energyUsesMaximumHours(2100)).toBe(8760);
    expect(energyUsesNumberError(6, 8784, 2024)).toBeUndefined();
    expect(energyUsesNumberError(6, 8784, 2025)).toBeTruthy();
    expect(energyUsesNumberError(7, 115, 2025)).toBeUndefined();
    expect(energyUsesNumberError(8, 101, 2025)).toBeTruthy();
    expect(energyUsesNumberError(9, 0, 2025)).toBeTruthy();
    expect(energyUsesNumberError(13, 1.5, 2025)).toBeTruthy();
    expect(energyUsesNumberError(14, 0, 2025)).toBeUndefined();
  });
});

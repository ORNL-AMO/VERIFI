import * as ExcelJS from 'exceljs';
import { buildModelingWorkbook } from './modeling-report-workbook';

async function read(blob: Blob) {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob);
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes); return workbook;
}
describe('Modeling workbook writer', () => {
  it('writes an Executive Summary with numeric cells, legacy column styles, frozen headings, and plain string names', async () => {
    const headers = ['Facility', 'Group', 'Baseline Year', 'Model Year', 'R2', 'Adjusted R2', 'Model P-Value',
      'Model Equation', 'Minor Issues', 'Critical Issues', 'Moderate Issues', 'Constant', 'Coefficient 1 Name', 'Coefficient 1 Value', 'Coefficient 1 p-Value'];
    const blob = await buildModelingWorkbook({ headers, rows: [['=SUM(A1:A2)', 'Group', 2022, 2022, 0, 0.123456789012345,
      0.000000000000123, '5.00 + (1.00*Output)', '—', '—', '—', 5, 'Output', -1.23456789012345, 0]] });
    const workbook = await read(blob), sheet = workbook.getWorksheet('Executive Summary')!;
    expect(workbook.worksheets.map(item => item.name)).toEqual(['Executive Summary']);
    expect(headers.map((_header, index) => sheet.getRow(1).getCell(index + 1).value)).toEqual(headers);
    expect(sheet.getCell('A2').value).toBe('=SUM(A1:A2)'); expect(sheet.getCell('A2').type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell('E2').value).toBe(0); expect(sheet.getCell('F2').value).toBe(0.123456789012345);
    expect(sheet.getCell('N2').value).toBe(-1.23456789012345); expect(sheet.getCell('O2').value).toBe(0);
    expect(sheet.getCell('G2').numFmt).toBe('0.000000000000000'); expect(sheet.getCell('O2').numFmt).toBe('0.000000000000000');
    expect(sheet.getColumn(8).width).toBe(40); expect(sheet.getColumn(1).width).toBe(20);
    expect(sheet.getRow(1).getCell(1).font.bold).toBe(true); expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(sheet.getRow(2).height).toBe(30); expect(blob.type).toContain('spreadsheetml.sheet');
  });
  it('serializes an empty summary and rejects cancellation before creating a workbook', async () => {
    const input = { headers: ['Facility', 'Group'], rows: [] };
    expect((await read(await buildModelingWorkbook(input))).getWorksheet('Executive Summary')!.rowCount).toBe(1);
    const controller = new AbortController(); controller.abort();
    await expect(buildModelingWorkbook(input, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

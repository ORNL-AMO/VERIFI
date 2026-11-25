import type * as ExcelJS from 'exceljs';
import BrowserExcelJS from 'exceljs/dist/exceljs.min.js';
import { ModelingReportWorkbook } from '@domain/reports/modeling-report-workbook';

/** Generation only; the owning report export controller handles saving, cancellation, and delivery. */
export async function buildModelingWorkbook(input: ModelingReportWorkbook, signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted();
  const workbook: ExcelJS.Workbook = new BrowserExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Executive Summary');
  sheet.addRow([...input.headers]);
  for (const row of input.rows) { signal?.throwIfAborted(); sheet.addRow([...row]); }
  sheet.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
    cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  sheet.getColumn(7).numFmt = '0.000000000000000';
  for (let column = 15; column <= input.headers.length; column += 3) sheet.getColumn(column).numFmt = '0.000000000000000';
  for (let column = 1; column <= input.headers.length; column++) sheet.getColumn(column).width = column === 8 ? 40 : 20;
  sheet.eachRow((row, index) => {
    row.height = 30;
    if (index > 1) row.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: input.headers.length } };
  const bytes = await workbook.xlsx.writeBuffer();
  signal?.throwIfAborted();
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

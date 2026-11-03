import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { BETTER_PLANTS_TEMPLATES } from './better-plants-assets.service';
import { buildBetterPlantsWorkbook } from './better-plants-workbook';

function template(category: 'energy' | 'water'): ArrayBuffer {
  const bytes = readFileSync(join(process.cwd(), 'src/assets/csv_templates', `${BETTER_PLANTS_TEMPLATES[category]}.xlsx`));
  return Uint8Array.from(bytes).buffer;
}
async function read(blob: Blob): Promise<ExcelJS.Workbook> {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob);
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes); return workbook;
}
function input(category: 'energy' | 'water', allYears = false) {
  const snapshot = analysisReportFixture(category), report = snapshot.accountReports[0];
  Object.assign(report.betterPlantsReportSetup, { includeAllYears: allYears, includePerformanceTable: true,
    baselineAdjustmentNotes: 'Baseline adjustment', modificationNotes: 'Upgraded equipment', methodologyNotes: 'Method notes' });
  return { account: snapshot.account, report, category, baselineYear: 2020,
    summaries: calculateBetterPlantsReport(buildAnalysisReportInputs(snapshot, 'account-analysis'), allYears ? [2024, 2023] : [2023]) };
}

describe('Better Plants workbook contract', () => {
  it.each([
    ['energy', '88d6d2d048361d4fd67e1080556f59e2b40f79715e44ab5dac4c0241b63c5ded'],
    ['water', 'bcaba399e0d425e98380ce7b1e3fed9450be86ba88e082618019cc717dc6bdf3']
  ] as const)('retains the approved %s template binary unchanged', (category, digest) => {
    expect(createHash('sha256').update(new Uint8Array(template(category))).digest('hex')).toBe(digest);
  });
  it('preserves the energy template formulas, layout and percentage-cell convention', async () => {
    const data = input('energy'); data.summaries[0].totalEnergySavingsBanked = 12.5;
    data.summaries[0].baselineYearEnergyResults.electricityUse = 0;
    const bytes = template('energy'), original = new ExcelJS.Workbook(); await original.xlsx.load(bytes);
    // Compare equivalent serialization boundaries: ExcelJS normalizes pageSetup flags when writing.
    await original.xlsx.load(await original.xlsx.writeBuffer());
    const workbook = await read(await buildBetterPlantsWorkbook(bytes, data));
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Instructions', 'Annual Form (2023)']);
    const sheet = workbook.getWorksheet('Annual Form (2023)')!, master = original.getWorksheet('Annual Form')!;
    expect(sheet.getCell('D10').value).toBe(2020);
    expect(sheet.getCell('D14').value).toBe(0);
    expect(sheet.getCell('E33').value).toBe(data.summaries[0].percentAnnualImprovement / 100);
    expect(sheet.getCell('E34').value).toBe(data.summaries[0].percentTotalEnergyImprovement / 100);
    for (const cell of ['D26', 'E26', 'D29', 'E31']) expect(sheet.getCell(cell).value).toEqual(master.getCell(cell).value);
    expect(sheet.getCell('C39').value).toBe('Baseline adjustment; 12.5 MMBtu of banked savings included.');
    expect(sheet.getCell('C44').value).toBe('Upgraded equipment');
    expect(sheet.getCell('E33').style).toEqual(master.getCell('E33').style);
    expect(sheet.getColumn('C').width).toBe(master.getColumn('C').width);
    expect(sheet.getRow(12).height).toBe(master.getRow(12).height);
    expect(sheet.pageSetup).toEqual(master.pageSetup);
    expect((sheet.model as ExcelJS.WorksheetModel & { merges: string[] }).merges)
      .toEqual((master.model as ExcelJS.WorksheetModel & { merges: string[] }).merges);
  });

  it('preserves water mappings, hidden helper sheet and raw percentage numbers', async () => {
    const data = input('water'), summary = data.summaries[0];
    summary.reportYearWaterResults.numberOfFacilities = 4; summary.baselineYearWaterResults.numberOfFacilities = 2;
    summary.reportYearWaterResults.waterUtility.meteredType = 'Mixed'; summary.totalWaterSavingsBanked = 7;
    const original = new ExcelJS.Workbook(); await original.xlsx.load(template('water'));
    const workbook = await read(await buildBetterPlantsWorkbook(template('water'), data));
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Instructions', 'Baseline Form (2023)', 'Sheet1']);
    expect(workbook.getWorksheet('Sheet1')!.state).toBe('hidden');
    const sheet = workbook.getWorksheet('Baseline Form (2023)')!;
    expect(sheet.getCell('E16').value).toBe(2020);
    expect(sheet.getCell('E19').value).toBe(4); expect(sheet.getCell('F19').value).toBe(2);
    expect(sheet.getCell('H24').value).toBe('mixed');
    expect(sheet.getCell('E50').value).toBe(summary.percentAnnualImprovement);
    expect(sheet.getCell('E51').value).toBe(summary.percentTotalWaterImprovement);
    expect(sheet.getCell('D55').value).toBe('Baseline adjustment; 7 kGal of banked savings included.');
    expect(sheet.getCell('D61').value).toBe('Upgraded equipment');
    expect(sheet.getCell('E43').value).toEqual(original.getWorksheet('Baseline Form')!.getCell('E43').value);
  });

  it.each(['energy', 'water'] as const)('retains a blank %s master, independent values and form styles for every output year', async category => {
    const data = input(category, true), form = category === 'energy' ? 'Annual Form' : 'Baseline Form';
    const accountCell = category === 'energy' ? 'D3' : 'E8', yearCell = category === 'energy' ? 'D9' : 'E15';
    const useCell = category === 'energy' ? 'E14' : 'G24';
    if (category === 'energy') { data.summaries[0].reportYearEnergyResults.electricityUse = 10; data.summaries[1].reportYearEnergyResults.electricityUse = 20; }
    else { data.summaries[0].reportYearWaterResults.waterUtility.use = 10; data.summaries[1].reportYearWaterResults.waterUtility.use = 20; }
    const bytes = template(category), before = Uint8Array.from(new Uint8Array(bytes));
    const workbook = await read(await buildBetterPlantsWorkbook(bytes, data));
    expect(new Uint8Array(bytes)).toEqual(before);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(category === 'energy'
      ? ['Instructions', `${form} (blank)`, `${form} (2024)`, `${form} (2023)`]
      : ['Instructions', `${form} (blank)`, 'Sheet1', `${form} (2024)`, `${form} (2023)`]);
    const master = workbook.getWorksheet(`${form} (blank)`)!, newest = workbook.getWorksheet(`${form} (2024)`)!, prior = workbook.getWorksheet(`${form} (2023)`)!
    expect(master.getCell(accountCell).value).not.toBe(data.account.name);
    expect(newest.getCell(yearCell).value).toBe(2024); expect(prior.getCell(yearCell).value).toBe(2023);
    expect(newest.getCell(useCell).value).toBe(10); expect(prior.getCell(useCell).value).toBe(20);
    expect(newest.getCell(useCell).style).toEqual(master.getCell(useCell).style);
    expect(prior.getCell(useCell).style).toEqual(master.getCell(useCell).style);
    // ExcelJS intentionally deduplicates style objects on reload. Verify the exported worksheets,
    // rather than requiring reference independence of the consuming application's style cache.
    newest.getCell(useCell).value = 30;
    expect(prior.getCell(useCell).value).toBe(20);
    expect(master.getCell(useCell).value).not.toBe(30);
  });

  it('retains strict performance boundaries and leaves empty bands untouched', async () => {
    const data = input('energy'), facility = analysisReportFixture().facilities[0];
    data.summaries[0].facilityPerformance = [0, 1, 2, 3, 35, 36].map(performance => ({ facility, performance }));
    const original = new ExcelJS.Workbook(); await original.xlsx.load(template('energy'));
    const workbook = await read(await buildBetterPlantsWorkbook(template('energy'), data));
    const sheet = workbook.getWorksheet('Annual Form (2023)')!;
    expect(sheet.getCell('E54').value).toBe(1); expect(sheet.getCell('E55').value).toBe(1);
    expect(sheet.getCell('E64').value).toBe(1);
    expect(sheet.getCell('E53').value).toEqual(original.getWorksheet('Annual Form')!.getCell('E53').value);
  });

  it('rejects missing periods, malformed templates and cancellation before serializing', async () => {
    const data = input('energy');
    await expect(buildBetterPlantsWorkbook(template('energy'), { ...data, summaries: [] })).rejects.toThrow('No Better Plants');
    await expect(buildBetterPlantsWorkbook(new ArrayBuffer(0), data)).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(buildBetterPlantsWorkbook(template('energy'), data, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

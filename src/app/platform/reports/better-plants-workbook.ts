import type * as ExcelJS from 'exceljs';
import BrowserExcelJS from 'exceljs/dist/exceljs.min.js';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { BetterPlantsEnergySummary, BetterPlantsSummary, BetterPlantsWaterSummary, WaterSummaryItem } from '@data/models/overview-report';
import { getNAICS } from '@shared/form-data/naics-data';

export interface BetterPlantsWorkbookInput {
  readonly account: IdbAccount;
  readonly report: IdbAccountReport;
  readonly summaries: readonly BetterPlantsSummary[];
  readonly category: 'energy' | 'water';
  readonly baselineYear: number;
}

/** Populate the existing DOE workbook. The binary templates and their formulas remain authoritative. */
export async function buildBetterPlantsWorkbook(template: ArrayBuffer, input: BetterPlantsWorkbookInput,
  signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted();
  if (!input.summaries.length) throw new Error('No Better Plants report periods are available.');
  if (!template.byteLength) throw new Error('The Better Plants Excel template is empty. Reload VERIFI and try again.');
  // Use the bundled browser implementation in both web and Electron renderers.
  const workbook: ExcelJS.Workbook = new BrowserExcelJS.Workbook();
  await workbook.xlsx.load(template);
  signal?.throwIfAborted();
  const formName = input.category === 'energy' ? 'Annual Form' : 'Baseline Form';
  const master = workbook.getWorksheet(formName);
  if (!master) throw new Error(`The Better Plants template is missing its ${formName} worksheet.`);
  const allYears = input.report.betterPlantsReportSetup.includeAllYears === true;
  const summaries = allYears ? [...input.summaries].sort((a, b) => b.reportYear - a.reportYear) : input.summaries.slice(0, 1);
  if (allYears) master.name = `${formName} (blank)`;
  for (const summary of summaries) {
    signal?.throwIfAborted();
    const name = `${formName} (${summary.reportYear})`;
    const sheet = allYears ? workbook.addWorksheet(name) : master;
    if (allYears) {
      // ExcelJS's setter expects mergeCells, while its getter exposes merges. Never share the master model.
      const model = structuredClone(master.model) as ExcelJS.WorksheetModel & { merges: string[] };
      sheet.model = { ...model, id: sheet.id, name, mergeCells: [...model.merges] } as ExcelJS.WorksheetModel;
    }
    sheet.name = name;
    if (input.category === 'energy') writeEnergy(sheet, input, summary);
    else writeWater(sheet, input, summary);
  }
  const bytes = await workbook.xlsx.writeBuffer();
  signal?.throwIfAborted();
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function accountFields(input: BetterPlantsWorkbookInput, summary: BetterPlantsSummary): readonly (string | number)[] {
  const account = input.account;
  return [account.name, account.contactName,
    account.address + ' ' + account.city + ', ' + account.state + ' ' + account.zip + ' ' + account.country,
    account.contactPhone, account.contactEmail, getNAICS(account), summary.reportYear, input.baselineYear];
}

const ENERGY_ROWS: readonly [keyof BetterPlantsEnergySummary, number, string?, (keyof BetterPlantsEnergySummary)?][] = [
  ['electricityUse', 14], ['naturalGasUse', 15], ['distilateFuelUse', 16], ['residualFuelUse', 17],
  ['coalUse', 18], ['cokeEnergyUse', 19], ['blastFurnaceEnergyUse', 20], ['woodWasteEnergyUse', 21],
  ['otherGasUse', 22, 'Other Gas', 'otherGasFuels'], ['otherLiquidUse', 23, 'Other Liquid', 'otherLiquidFuels'],
  ['otherSolidUse', 24, 'Other Solid', 'otherSolidFuels'], ['otherEnergyUse', 25, 'Other Energy', 'otherEnergyTypes']
];

function writeEnergy(sheet: ExcelJS.Worksheet, input: BetterPlantsWorkbookInput, summary: BetterPlantsSummary): void {
  accountFields(input, summary).forEach((value, index) => sheet.getCell(`D${index + 3}`).value = value);
  const baseline = summary.baselineYearEnergyResults, current = summary.reportYearEnergyResults;
  sheet.getCell('D12').value = baseline.numberOfFacilities;
  sheet.getCell('E12').value = current.numberOfFacilities;
  for (const [key, row, label, fuels] of ENERGY_ROWS) {
    const inUse = !!(baseline[key] || current[key]);
    if (label && inUse) sheet.getCell(`C${row}`).value = `${label} (${[...new Set(baseline[fuels!] as string[])].join(', ')})`;
    // The existing template retains its Other Energy cells when no such fuel is used.
    if (key !== 'otherEnergyUse' || inUse) {
      sheet.getCell(`D${row}`).value = baseline[key] as number;
      sheet.getCell(`E${row}`).value = current[key] as number;
    }
  }
  sheet.getCell('D27').value = summary.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
  sheet.getCell('D28').value = summary.reportYearAnalysisSummary.baselineAdjustmentForOtherV2;
  sheet.getCell('E30').value = summary.reportYearAnalysisSummary.newSavings;
  sheet.getCell('E33').value = summary.percentAnnualImprovement / 100;
  sheet.getCell('E34').value = summary.percentTotalEnergyImprovement / 100;
  writeNotes(sheet, input.report, summary.totalEnergySavingsBanked, 'MMBtu', 'C39', 'C44');
  if (input.report.betterPlantsReportSetup.includePerformanceTable) writePerformance(sheet, summary, 53);
}

const WATER_ROWS: readonly (keyof BetterPlantsWaterSummary)[] = [
  'waterUtility', 'additionalWaterUtility', 'surfaceFreshwater', 'additionalSurfaceFreshWater',
  'groundFreshwater', 'additionalGroundFreshwater', 'otherFreshwater', 'additionalOtherFreshwater',
  'salineWaterIntake', 'additionalSalineWaterIntake', 'rainwater', 'additionalRainwater',
  'externallySuppliedRecycled', 'additionalExternallySuppliedRecycled'
];

function writeWater(sheet: ExcelJS.Worksheet, input: BetterPlantsWorkbookInput, summary: BetterPlantsSummary): void {
  const fields = accountFields(input, summary);
  [8, 9, 11, 12, 13, 14, 15, 16].forEach((row, index) => sheet.getCell(`E${row}`).value = fields[index]);
  const baseline = summary.baselineYearWaterResults, current = summary.reportYearWaterResults;
  // Preserve the existing form's participation-column mapping.
  sheet.getCell('E19').value = current.numberOfFacilities;
  sheet.getCell('F19').value = baseline.numberOfFacilities;
  sheet.getCell('E20').value = current.numberOfManufacturingFacilities;
  sheet.getCell('F20').value = baseline.numberOfManufacturingFacilities;
  WATER_ROWS.forEach((key, index) => {
    const row = index + 24, base = baseline[key] as WaterSummaryItem, report = current[key] as WaterSummaryItem;
    sheet.getCell(`E${row}`).value = base.use;
    sheet.getCell(`F${row}`).value = meteredStatus(base.meteredType);
    sheet.getCell(`G${row}`).value = report.use;
    sheet.getCell(`H${row}`).value = meteredStatus(report.meteredType);
  });
  sheet.getCell('E38').value = baseline.totalWaterIntake;
  sheet.getCell('G38').value = current.totalWaterIntake;
  sheet.getCell('E39').value = baseline.totalWaterIntakeIncludeAdditional;
  sheet.getCell('G39').value = current.totalWaterIntakeIncludeAdditional;
  sheet.getCell('E41').value = summary.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
  sheet.getCell('E42').value = input.report.betterPlantsReportSetup.baselineAdjustmentNotes;
  // E43 remains owned by the unmodified template; the legacy writer does not populate it.
  current.unitsUsed.slice(0, 5).forEach((unit, index) => sheet.getCell(`${['E', 'F', 'G', 'H', 'I'][index]}45`).value = unit);
  sheet.getCell('E48').value = input.report.betterPlantsReportSetup.baselineYearWaterPilotGoal;
  sheet.getCell('F48').value = input.report.betterPlantsReportSetup.reportYearWaterPilotGoal;
  // Unlike the energy form, the water form stores percentage numbers directly.
  sheet.getCell('E50').value = summary.percentAnnualImprovement;
  sheet.getCell('E51').value = summary.percentTotalWaterImprovement;
  writeNotes(sheet, input.report, summary.totalWaterSavingsBanked, 'kGal', 'D55', 'D61');
  if (input.report.betterPlantsReportSetup.includePerformanceTable) writePerformance(sheet, summary, 71);
}

function meteredStatus(value: WaterSummaryItem['meteredType']): string | undefined {
  return value === 'N/A' ? undefined : value.toLowerCase();
}

function writeNotes(sheet: ExcelJS.Worksheet, report: IdbAccountReport, banked: number, unit: string,
  baselineCell: string, modificationCell: string): void {
  const notes = report.betterPlantsReportSetup.baselineAdjustmentNotes;
  if (notes || banked) sheet.getCell(baselineCell).value = notes && banked
    ? `${notes}; ${banked} ${unit} of banked savings included.` : notes || `${banked} ${unit} of banked savings included.`;
  if (report.betterPlantsReportSetup.modificationNotes) sheet.getCell(modificationCell).value = report.betterPlantsReportSetup.modificationNotes;
}

function writePerformance(sheet: ExcelJS.Worksheet, summary: BetterPlantsSummary, startRow: number): void {
  const bounds = [undefined, 0, 2, 4, 6, 8, 10, 15, 20, 25, 30, 35, undefined];
  bounds.slice(0, -1).forEach((min, index) => {
    const max = bounds[index + 1];
    const count = summary.facilityPerformance.filter(item => (min === undefined || item.performance > min)
      && (max === undefined || item.performance < max)).length;
    if (count) sheet.getCell(`E${startRow + index}`).value = count;
  });
}

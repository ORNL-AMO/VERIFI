import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbFacility } from '@data/models/idbModels/facility';
import { BetterPlantsEnergySummary, BetterPlantsSummary, BetterPlantsWaterSummary, WaterSummaryItem } from '@data/models/overview-report';
import { getNAICS } from '@shared/form-data/naics-data';

export interface BetterPlantsRow {
  readonly label: string;
  readonly baseline?: number;
  readonly report?: number;
  readonly baselineMetered?: string;
  readonly reportMetered?: string;
  readonly percent?: boolean;
  readonly total?: boolean;
  readonly additional?: boolean;
}
export interface BetterPlantsPage {
  readonly year: number;
  readonly water: boolean;
  readonly baselineLabel: string;
  readonly reportLabel: string;
  readonly counts: readonly BetterPlantsRow[];
  readonly consumption: readonly BetterPlantsRow[];
  readonly metrics: readonly BetterPlantsRow[];
  readonly notes: readonly { readonly label: string; readonly text: string }[];
  readonly waterAdjustment?: string;
  readonly waterMetricUnits?: string;
  readonly waterPilot?: BetterPlantsRow;
  readonly additionalWater: boolean;
  readonly performance: readonly { readonly label: string; readonly count: number; readonly facilities: readonly string[] }[];
}

/** Presentation only: retain precision and share the result with later document adapters. */
export function buildBetterPlantsPages(report: IdbAccountReport, account: IdbAccount, baselineYear: number,
  category: 'energy' | 'water', summaries: readonly BetterPlantsSummary[], facilities: readonly IdbFacility[]): readonly BetterPlantsPage[] {
  const water = category === 'water', setup = report.betterPlantsReportSetup;
  return summaries.map(summary => {
    const resource = water ? 'Water' : 'Energy', unit = water ? 'kGal' : 'MMBtu';
    const baseWater = summary.baselineYearWaterResults, reportWater = summary.reportYearWaterResults;
    const metrics: BetterPlantsRow[] = [
      { label: `Weather/Production/Other Normalizing related Adjustment for Baseline Primary ${water ? 'Energy, (+/- thousand gallons)' : 'Energy, (+/- MMBtu)'}`, baseline: summary.reportYearAnalysisSummary.baselineAdjustmentForNormalization },
      { label: `Baseline Adjustment Due to Increase/Decrease in the Number of Facilities Reporting Relative to Baseline Year or Other Operational Changes, (+/- ${water ? 'thousand gallons' : 'MMBtu'})`, baseline: summary.reportYearAnalysisSummary.baselineAdjustmentForOtherV2 },
      { label: water ? 'Adjusted baseline for total water intake (thousand gallons)' : 'Adjusted Baseline of Primary Energy (MMBtu)', baseline: water ? summary.adjustedBaselinePrimaryWater : summary.adjustedBaselinePrimaryEnergy, total: true },
      { label: `New ${resource} Savings for Current Year (${unit})`, report: summary.reportYearAnalysisSummary.newSavings }
    ];
    const unbanked = water ? summary.totalWaterSavingsUnbanked : summary.totalEnergySavingsUnbanked;
    const banked = water ? summary.totalWaterSavingsBanked : summary.totalEnergySavingsBanked;
    if (unbanked) metrics.push({ label: `Unbanked ${resource} Savings (${unit})`, report: unbanked });
    if (banked) metrics.push({ label: `Banked ${resource} Savings (${unit})`, report: banked });
    metrics.push({ label: `Total ${resource} Savings since Baseline Year (${unit})`, report: water ? summary.totalWaterSavings : summary.totalEnergySavings, total: true },
      { label: `Annual Improvement In ${resource} Intensity for Current Year (%)**`, report: summary.percentAnnualImprovement, percent: true },
      { label: `Total Improvement In ${resource} Intensity (%)**`, report: water ? summary.percentTotalWaterImprovement : summary.percentTotalEnergyImprovement, percent: true, total: true });
    const notes = summary.reportYear !== report.reportYear ? [] : water ? [
      { label: 'Please describe the methodology used for calculating water intensity improvements:', text: setup.methodologyNotes || 'N/A' },
      { label: 'Please briefly describe major technologies, strategies, and practices employed during the previous year to decrease water intensity. Please identify: systems/processes impacted, approximate water savings from projects, and implementation cost:', text: setup.modificationNotes || 'N/A' }
    ] : [
      { label: 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:', text: setup.baselineAdjustmentNotes || 'N/A' },
      { label: 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project—12,000 MMBtu/yr savings, compressor controls upgrade—6,000 MMBtu/yr, energy awareness campaign, etc):', text: setup.modificationNotes || 'N/A' }
    ];
    return { year: summary.reportYear, water, baselineLabel: reportYearLabel(baselineYear, account), reportLabel: reportYearLabel(summary.reportYear, account),
      // Preserve v0's displayed water count column order during this migration.
      counts: water ? [
        { label: 'Number of Participating Facilities*', baseline: reportWater.numberOfFacilities, report: baseWater.numberOfFacilities },
        { label: 'Number of Participating Manufacturing Facilities*', baseline: reportWater.numberOfManufacturingFacilities, report: baseWater.numberOfManufacturingFacilities }
      ] : [{ label: 'Number of Participating Plants*', baseline: summary.baselineYearEnergyResults.numberOfFacilities, report: summary.reportYearEnergyResults.numberOfFacilities }],
      consumption: water ? waterConsumption(baseWater, reportWater) : energyConsumption(summary.baselineYearEnergyResults, summary.reportYearEnergyResults), metrics, notes,
      waterAdjustment: water ? setup.baselineAdjustmentNotes ?? '' : undefined,
      waterMetricUnits: water ? reportWater.unitsUsed.join(', ') : undefined,
      waterPilot: water && (setup.baselineYearWaterPilotGoal || setup.reportYearWaterPilotGoal) ? {
        label: 'For partners using a single water intensity metric across all plants, water intensity or other metric used for tracking Water Savings Pilot goal (numeric value)',
        baseline: setup.baselineYearWaterPilotGoal, report: setup.reportYearWaterPilotGoal } : undefined,
      additionalWater: water && (baseWater.totalWaterIntakeIncludeAdditional !== baseWater.totalWaterIntake || reportWater.totalWaterIntakeIncludeAdditional !== reportWater.totalWaterIntake),
      performance: setup.includePerformanceTable ? performanceBands(summary, facilities) : [] };
  });
}

export function betterPlantsCompany(account: IdbAccount) {
  return { name: account.name, address: account.address ? [account.address, account.city, account.state, account.zip, account.country].filter(Boolean).join(' ') : '',
    naics: getNAICS(account), contactName: account.contactName || '—', contactPhone: account.contactPhone || '—', contactEmail: account.contactEmail || '—' };
}

function reportYearLabel(year: number, account: IdbAccount): string {
  if (account.fiscalYear !== 'nonCalendarYear') return String(year);
  const startYear = account.fiscalYearCalendarEnd ? year - 1 : year;
  const start = new Date(startYear, account.fiscalYearMonth), end = new Date(startYear + 1, account.fiscalYearMonth - 1);
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return `FY - ${year} (${format(start)} – ${format(end)})`;
}
const ENERGY_ROWS: readonly [keyof BetterPlantsEnergySummary, string, (keyof BetterPlantsEnergySummary)?][] = [
  ['electricityUse', 'Electricity'], ['naturalGasUse', 'Natural Gas'], ['distilateFuelUse', 'Distillate or Light Fuel Oil (#1, 2 & 4)'],
  ['residualFuelUse', 'Residual or Heavy Fuel Oil (#5, 6, Navy Special & Bunker C)'], ['coalUse', 'Coal'], ['cokeEnergyUse', 'Coke'],
  ['blastFurnaceEnergyUse', 'Blast Furnace Gas'], ['woodWasteEnergyUse', 'Wood Waste'], ['otherGasUse', 'Other Gas', 'otherGasFuels'],
  ['otherLiquidUse', 'Other Liquid', 'otherLiquidFuels'], ['otherSolidUse', 'Other Solid', 'otherSolidFuels'], ['otherEnergyUse', 'Other Energy', 'otherEnergyTypes']
];
function energyConsumption(baseline: BetterPlantsEnergySummary, report: BetterPlantsEnergySummary): BetterPlantsRow[] {
  return [...ENERGY_ROWS.filter(([key]) => baseline[key] || report[key]).map(([key, label, fuels]) => ({
    label: fuels ? `${label} (${[...new Set(baseline[fuels] as string[])].join(', ')})` : label,
    baseline: baseline[key] as number, report: report[key] as number })),
    { label: 'Total Primary Energy Consumed (MMBtu)', baseline: baseline.totalEnergyUse, report: report.totalEnergyUse, total: true }];
}
const WATER_ROWS: readonly [keyof BetterPlantsWaterSummary, keyof BetterPlantsWaterSummary, string][] = [
  ['waterUtility', 'additionalWaterUtility', 'Water Utility (public or private)'],
  ['surfaceFreshwater', 'additionalSurfaceFreshWater', 'Surface freshwater, including self-supplied'],
  ['groundFreshwater', 'additionalGroundFreshwater', 'Ground freshwater, including self-supplied'],
  ['otherFreshwater', 'additionalOtherFreshwater', 'Other freshwater'],
  ['salineWaterIntake', 'additionalSalineWaterIntake', 'Total saline water intake (e.g., ocean water)'],
  ['rainwater', 'additionalRainwater', 'Rainwater'],
  ['externallySuppliedRecycled', 'additionalExternallySuppliedRecycled', 'Externally supplied recycled (i.e., grey water)']
];
function waterConsumption(baseline: BetterPlantsWaterSummary, report: BetterPlantsWaterSummary): BetterPlantsRow[] {
  const rows: BetterPlantsRow[] = [];
  for (const [primary, extra, label] of WATER_ROWS) for (const key of [primary, extra]) {
    const base = baseline[key] as WaterSummaryItem, current = report[key] as WaterSummaryItem;
    if (base.use || current.use) rows.push({ label, baseline: base.use, report: current.use,
      baselineMetered: base.meteredType, reportMetered: current.meteredType, additional: key === extra });
  }
  rows.push({ label: 'Total Water Intake', baseline: baseline.totalWaterIntake, report: report.totalWaterIntake, total: true });
  if (baseline.totalWaterIntakeIncludeAdditional !== baseline.totalWaterIntake || report.totalWaterIntakeIncludeAdditional !== report.totalWaterIntake) {
    rows.push({ label: 'Total Water Intake included in target', baseline: baseline.totalWaterIntakeIncludeAdditional, report: report.totalWaterIntakeIncludeAdditional, total: true });
  }
  return rows;
}
function performanceBands(summary: BetterPlantsSummary, facilities: readonly IdbFacility[]) {
  const limits = [undefined, 0, 2, 4, 6, 8, 10, 15, 20, 25, 30, 35, undefined];
  return limits.slice(0, -1).map((min, index) => {
    const max = limits[index + 1];
    // Characterize existing strict inequalities; changing boundary policy is a separate calculation change.
    const included = summary.facilityPerformance.filter(item => (min === undefined || item.performance > min) && (max === undefined || item.performance < max));
    return { label: min === undefined ? '<0%' : max === undefined ? '>35%' : `${min}-${max}%`, count: included.length,
      facilities: included.map(item => facilities.find(facility => facility.guid === item.facility.guid)?.name ?? item.facility.name) };
  });
}

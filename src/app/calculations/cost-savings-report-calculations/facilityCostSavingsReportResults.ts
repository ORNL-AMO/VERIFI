import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CostSavingsReportSettings, YearGroupData, MonthlyGroupData } from 'src/app/models/idbModels/facilityReport';

export interface GroupSummary {
  group: AnalysisGroup;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  annualAnalysisSummaryData: Array<AnnualAnalysisSummary>;
}

export class FacilityCostSavingsReportResults {
  costSavingsTable: YearGroupData = {};
  cumulativeCostSavingsTable: YearGroupData = {};
  estimatedEnergyCostTable: YearGroupData = {};
  expectedEnergyCostTable: YearGroupData = {};
  energyUseTable: YearGroupData = {};
  adjustedEnergyUseTable: YearGroupData = {};
  energySavingsTable: YearGroupData = {};

  monthlyCostSavingsTable: MonthlyGroupData = {};
  cumulativeMonthlyCostSavingsTable: MonthlyGroupData = {};
  estimatedMonthlyEnergyCostTable: MonthlyGroupData = {};
  expectedMonthlyEnergyCostTable: MonthlyGroupData = {};
  monthlyEnergyUseTable: MonthlyGroupData = {};
  monthlyAdjustedEnergyUseTable: MonthlyGroupData = {};
  monthlyEnergySavingsTable: MonthlyGroupData = {};
  monthKeys: string[] = [];

  constructor(
    private groupSummaries: Array<GroupSummary>,
    private convertedCostDataTable: YearGroupData,
    private reportSettings: CostSavingsReportSettings
  ) {
    this.buildAnnualTables();
    this.buildMonthlyTables();
  }

  private buildAnnualTables() {
    this.groupSummaries.forEach(({ group, annualAnalysisSummaryData }) => {
      const groupId = group.idbGroupId;
      annualAnalysisSummaryData.forEach(summary => {
        if (summary.year > this.reportSettings.endYear) return;
        const { year, energyUse, adjusted, savings } = summary;
        const rate = this.convertedCostDataTable[year]?.[groupId] ?? 0;

        this.setValue(this.energyUseTable, year, groupId, energyUse);
        this.setValue(this.adjustedEnergyUseTable, year, groupId, adjusted);
        this.setValue(this.energySavingsTable, year, groupId, savings);
        this.setValue(this.estimatedEnergyCostTable, year, groupId, energyUse * rate);
        this.setValue(this.expectedEnergyCostTable, year, groupId, adjusted * rate);
        const costSavings = (adjusted - energyUse) * rate;
        this.setValue(this.costSavingsTable, year, groupId, costSavings);
        const prevCumulative = this.cumulativeCostSavingsTable[year - 1]?.[groupId] ?? 0;
        this.setValue(this.cumulativeCostSavingsTable, year, groupId, prevCumulative + costSavings);
      });
    });
  }

  private buildMonthlyTables() {
    const allKeys = new Set<string>();
    this.groupSummaries.forEach(({ group, monthlyAnalysisSummaryData }) => {
      const groupId = group.idbGroupId;
      let runningCumulative = 0;
      monthlyAnalysisSummaryData.forEach(m => {
        const year = m.date.getFullYear();
        const month = m.date.getMonth();
        if (!this.isWithinReportEnd(year, month)) return;
        const monthKey = `${year}-${month}`;
        allKeys.add(monthKey);
        const rate = this.getYearlyRate(groupId, year);

        this.setValue(this.monthlyEnergyUseTable, monthKey, groupId, m.energyUse);
        this.setValue(this.monthlyAdjustedEnergyUseTable, monthKey, groupId, m.adjusted);
        this.setValue(this.monthlyEnergySavingsTable, monthKey, groupId, m.savings);
        this.setValue(this.estimatedMonthlyEnergyCostTable, monthKey, groupId, m.energyUse * rate);
        this.setValue(this.expectedMonthlyEnergyCostTable, monthKey, groupId, m.adjusted * rate);
        const costSavings = (m.adjusted - m.energyUse) * rate;
        this.setValue(this.monthlyCostSavingsTable, monthKey, groupId, costSavings);
        runningCumulative += costSavings;
        this.setValue(this.cumulativeMonthlyCostSavingsTable, monthKey, groupId, runningCumulative);
      });
    });
    this.monthKeys = Array.from(allKeys).sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay !== by ? ay - by : am - bm;
    });
  }

  private setValue(table: YearGroupData | MonthlyGroupData, key: number | string, groupId: string, value: number) {
    if (!table[key]) table[key as any] = {};
    table[key as any][groupId] = value;
  }

  private getYearlyRate(groupId: string, year: number): number {
    const rate = this.convertedCostDataTable[year]?.[groupId];
    return (rate !== undefined && !isNaN(rate)) ? rate : 0;
  }

  private isWithinReportEnd(year: number, month: number): boolean {
    const { endYear, endMonth } = this.reportSettings;
    return year < endYear || (year === endYear && month <= endMonth);
  }
}
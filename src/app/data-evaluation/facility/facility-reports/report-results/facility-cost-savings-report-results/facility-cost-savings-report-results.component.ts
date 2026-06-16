import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CostSavingsReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { convertConsumptionRate, getYearsArray } from 'src/app/shared/sharedHelperFunctions';

@Component({
  selector: 'app-facility-cost-savings-report-results',
  standalone: false,
  templateUrl: './facility-cost-savings-report-results.component.html',
  styleUrl: './facility-cost-savings-report-results.component.css',
})
export class FacilityCostSavingsReportResultsComponent {

  facilityReportSub: Subscription;
  facilityReport: IdbFacilityReport;
  reportSettings: CostSavingsReportSettings;
  selectedAnalysisItem: IdbAnalysisItem;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  years: Array<number>;
  facility: IdbFacility;
  worker: Worker;
  calculating: boolean | 'error' = false;

  groupUnits: { [groupId: string]: string } = {};
  costDataTable: YearGroupData = {};
  convertedCostDataTable: YearGroupData = {};
  finalUnit: string;
  baselineYear: number;
  baselineYearCost: { [groupId: string]: number } = {};
  dataComplete: boolean = false;

  costSavingsTable: YearGroupData = {};
  cumulativeCostSavingsTable: YearGroupData = {};
  estimatedEnergyCostTable: YearGroupData = {};
  expectedEnergyCostTable: YearGroupData = {};
  energyUseTable: YearGroupData = {};
  adjustedEnergyUseTable: YearGroupData = {};
  energySavingsTable: YearGroupData = {};

  monthKeys: Array<string> = [];
  monthlyCostSavingsTable: MonthlyGroupData = {};
  cumulativeMonthlyCostSavingsTable: MonthlyGroupData = {};
  estimatedMonthlyEnergyCostTable: MonthlyGroupData = {};
  expectedMonthlyEnergyCostTable: MonthlyGroupData = {};
  monthlyEnergyUseTable: MonthlyGroupData = {};
  monthlyAdjustedEnergyUseTable: MonthlyGroupData = {};
  monthlyEnergySavingsTable: MonthlyGroupData = {};

  constructor(
    private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.selectedAnalysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.baselineYear = this.selectedAnalysisItem?.baselineYear;
      this.reportSettings = this.facilityReport.costSavingsReportSettings;
      this.groupUnits = this.reportSettings.groupUnits;
      this.costDataTable = this.reportSettings.costSavingsTable;
      this.convertedCostDataTable = JSON.parse(JSON.stringify(this.reportSettings.costSavingsTable));
      this.convertToRequiredUnit();
      this.setBaselineYearCost();
      this.setYears();
      this.getGroupSummaries();
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  convertToRequiredUnit() {
    if (this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.finalUnit = this.selectedAnalysisItem.energyUnit;
    }
    else if (this.selectedAnalysisItem.analysisCategory == 'water') {
      this.finalUnit = this.selectedAnalysisItem.waterUnit;
    }
    for (const year in this?.convertedCostDataTable) {
      for (const groupId in this?.convertedCostDataTable[year]) {
        const cost = this.convertedCostDataTable[year][groupId];
        const originalUnit = this.groupUnits[groupId];
        if (originalUnit == this.finalUnit || cost == null || originalUnit == null)
          continue;

        const groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue().filter(meter => meter.groupId == groupId);
        if (groupMeters.length > 0) {
          this.convertedCostDataTable[year][groupId] = convertConsumptionRate(groupMeters[0], cost, this.finalUnit, this.selectedAnalysisItem.analysisCategory);
        }
      }
    }
  }

  setBaselineYearCost() {
    for (const groupId in this.convertedCostDataTable[this.baselineYear]) {
      this.baselineYearCost[groupId] = this.convertedCostDataTable[this.baselineYear][groupId];
    }
  }

  setYears() {
    this.years = getYearsArray(this.selectedAnalysisItem.baselineYear, this.reportSettings.endYear);
  }

  getGroupSummaries() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.facility = this.facilityDbService.getFacilityById(this.selectedAnalysisItem.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.selectedAnalysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.selectedAnalysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(this.selectedAnalysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(this.selectedAnalysisItem.facilityId);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../web-workers/facility-cost-savings-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.groupSummaries = data.groupSummaries;
          this.setSavings();
          this.setMonthlySavings();
          this.dataComplete = true;
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      const workerMessage = {
        analysisItem: this.selectedAnalysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
        report: this.facilityReport
      };
      this.worker.postMessage(workerMessage);
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.selectedAnalysisItem.energyIsSource, neededUnits: getNeededUnits(this.selectedAnalysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.selectedAnalysisItem, this.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, accountAnalysisItems, true);
      this.groupSummaries = annualAnalysisSummaryClass.groupSummaries;
      this.setSavings();
      this.dataComplete = true;
    }
  }

  setSavings() {
    if (!this.groupSummaries) {
      return;
    }
    if (this.groupSummaries) {
      this.groupSummaries.forEach(groupSummary => {
        const groupId = groupSummary.group.idbGroupId;
        const annualAnalysisSummaryData = groupSummary.annualAnalysisSummaryData;
        annualAnalysisSummaryData.forEach(summary => {
          if (summary.year <= this.reportSettings.endYear) {
            const year = summary.year;
            const energyUse = summary.energyUse;
            const adjustedEnergyUse = summary.adjusted;

            if (!this.energyUseTable[year]) {
              this.energyUseTable[year] = {};
            }
            this.energyUseTable[year][groupId] = energyUse;

            if (!this.adjustedEnergyUseTable[year]) {
              this.adjustedEnergyUseTable[year] = {};
            }
            this.adjustedEnergyUseTable[year][groupId] = adjustedEnergyUse;

            if (!this.energySavingsTable[year]) {
              this.energySavingsTable[year] = {};
            }
            this.energySavingsTable[year][groupId] = summary.savings;

            if (!this.estimatedEnergyCostTable[year]) {
              this.estimatedEnergyCostTable[year] = {};
            }
            this.estimatedEnergyCostTable[year][groupId] = energyUse * this.convertedCostDataTable[year][groupId];
            if (!this.expectedEnergyCostTable[year]) {
              this.expectedEnergyCostTable[year] = {};
            }
            this.expectedEnergyCostTable[year][groupId] = adjustedEnergyUse * this.baselineYearCost[groupId];

            if (!this.costSavingsTable[year]) {
              this.costSavingsTable[year] = {};
            }
            this.costSavingsTable[year][groupId] = this.expectedEnergyCostTable[year][groupId] - this.estimatedEnergyCostTable[year][groupId];

            if (!this.cumulativeCostSavingsTable[year]) {
              this.cumulativeCostSavingsTable[year] = {};
            }
            const previousYear = year - 1;
            const previousCumulativeSavings = this.cumulativeCostSavingsTable[previousYear] && this.cumulativeCostSavingsTable[previousYear][groupId] ? this.cumulativeCostSavingsTable[previousYear][groupId] : 0;
            this.cumulativeCostSavingsTable[year][groupId] = previousCumulativeSavings + this.costSavingsTable[year][groupId];
          }
        });
      });
    }
  }

  get filteredGroups() {
    return this.selectedAnalysisItem.groups.filter(group => group.analysisType != 'skip' && group.analysisType != 'skipAnalysis');
  }

  setMonthlySavings() {
    if (!this.groupSummaries) {
      return;
    }

    const allKeys = new Set<string>();

    if (this.groupSummaries) {
      this.groupSummaries.forEach(groupSummary => {
        const groupId = groupSummary.group.idbGroupId;
        const monthlyData = groupSummary.monthlyAnalysisSummaryData;
        let runningCumulativeSavings = 0;
        monthlyData.forEach(monthlySummary => {
          if (this.isWithinReportEnd(monthlySummary.date.getFullYear(), monthlySummary.date.getMonth())) {
            const monthKey = this.getMonthKey(monthlySummary.date.getFullYear(), monthlySummary.date.getMonth() + 1);
            allKeys.add(monthKey);

            if (!this.monthlyEnergyUseTable[monthKey]) {
              this.monthlyEnergyUseTable[monthKey] = {};
            }
            this.monthlyEnergyUseTable[monthKey][groupId] = monthlySummary.energyUse;

            if (!this.monthlyAdjustedEnergyUseTable[monthKey]) {
              this.monthlyAdjustedEnergyUseTable[monthKey] = {};
            }
            this.monthlyAdjustedEnergyUseTable[monthKey][groupId] = monthlySummary.adjusted;

            if (!this.monthlyEnergySavingsTable[monthKey]) {
              this.monthlyEnergySavingsTable[monthKey] = {};
            }
            this.monthlyEnergySavingsTable[monthKey][groupId] = monthlySummary.savings;

            if (!this.estimatedMonthlyEnergyCostTable[monthKey]) {
              this.estimatedMonthlyEnergyCostTable[monthKey] = {};
            }
            this.estimatedMonthlyEnergyCostTable[monthKey][groupId] = monthlySummary.energyUse * this.getYearlyRateForMonth(groupId, monthlySummary.date.getFullYear());

            if (!this.expectedMonthlyEnergyCostTable[monthKey]) {
              this.expectedMonthlyEnergyCostTable[monthKey] = {};
            }
            this.expectedMonthlyEnergyCostTable[monthKey][groupId] = monthlySummary.adjusted * this.baselineYearCost[groupId];

            if (!this.monthlyCostSavingsTable[monthKey]) {
              this.monthlyCostSavingsTable[monthKey] = {};
            }
            this.monthlyCostSavingsTable[monthKey][groupId] = this.expectedMonthlyEnergyCostTable[monthKey][groupId] - this.estimatedMonthlyEnergyCostTable[monthKey][groupId];

            if (!this.cumulativeMonthlyCostSavingsTable[monthKey]) {
              this.cumulativeMonthlyCostSavingsTable[monthKey] = {};
            }
            runningCumulativeSavings += this.monthlyCostSavingsTable[monthKey][groupId];
            this.cumulativeMonthlyCostSavingsTable[monthKey][groupId] = runningCumulativeSavings;
          }
        });
        this.monthKeys = Array.from(allKeys).sort((a, b) => {
          const [aYear, aMonth] = a.split('-').map(Number);
          const [bYear, bMonth] = b.split('-').map(Number);
          if (aYear === bYear) {
            return aMonth - bMonth;
          }
          return aYear - bYear;
        });
      });
    }
  }

  getMonthKey(year: number, month: number) {
    return `${year}-${month - 1}`;
  }

  getYearlyRateForMonth(groupId: string, year: number) {
    const rate = this.convertedCostDataTable[year] && this.convertedCostDataTable[year][groupId] !== undefined && !isNaN(this.convertedCostDataTable[year][groupId]) ? this.convertedCostDataTable[year][groupId] : 0;
    return rate;
  }

  isWithinReportEnd(year: number, month: number) {
    const reportEndYear = this.reportSettings.endYear;
    const reportEndMonth = this.reportSettings.endMonth;
    if (year < reportEndYear) {
      return true;
    } else if (year === reportEndYear) {
      return month <= reportEndMonth;
    } else {
      return false;
    }
  }
}

type YearGroupData = { [year: number]: { [groupId: string]: number } };
type MonthlyGroupData = { [monthKey: string]: { [groupId: string]: number } };



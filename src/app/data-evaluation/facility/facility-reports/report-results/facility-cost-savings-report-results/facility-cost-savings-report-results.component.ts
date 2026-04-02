import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
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
import { convertConsumptionRate, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';

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
  selectedAnalysisItem: IdbAnalysisItem ;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  years: Array<number>;
  facility: IdbFacility;
  worker: Worker;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  latestMonthSummary: MonthlyAnalysisSummaryData;
  calculating: boolean | 'error' = false;

  groupUnits: { [groupId: string]: string } = {};
  convertedGroupUnits: { [groupId: string]: string } = {};
  costDataTable: YearGroupData = {};
  convertedCostDataTable: YearGroupData = {};
  savingsDataTable: YearGroupData = {};
  cumulativeSavingsDataTable: YearGroupData = {};
  costSavingsData: YearGroupData = {};
  cumulativeCostSavingsData: YearGroupData = {};

  constructor(
    private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private accountDbService: AccountdbService,
  ) { }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.selectedAnalysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.reportSettings = this.facilityReport.costSavingsReportSettings;
      this.groupUnits = this.reportSettings.groupUnits;
      this.convertedGroupUnits = JSON.parse(JSON.stringify(this.reportSettings.groupUnits));
      this.checkGroupUnits();
      this.costDataTable = this.reportSettings.costSavingsTable;
      this.convertedCostDataTable = JSON.parse(JSON.stringify(this.reportSettings.costSavingsTable));
      this.convertToRequiredUnit();
      this.setYears();
    });
    this.getGroupSummaries();
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  checkGroupUnits() {
    for (const group of this.selectedAnalysisItem.groups) {
      let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue().filter(meter => meter.groupId == group.idbGroupId);
      if (groupMeters.length > 1) {
        this.convertedGroupUnits[group.idbGroupId] = this.selectedAnalysisItem.energyUnit;
      }
    }
  }

  convertToRequiredUnit() {
    for (const year in this?.convertedCostDataTable) {
      for (const groupId in this?.convertedCostDataTable[year]) {
        const cost = this.convertedCostDataTable[year][groupId];
        const originalUnit = this.convertedGroupUnits[groupId];
        const finalUnit = this.selectedAnalysisItem.energyUnit;
        if (originalUnit == finalUnit) {
          this.convertedCostDataTable[year][groupId] = cost;
          continue;
        }
        else {
          if (cost != null && originalUnit != null) {
            //this.convertedCostDataTable[year][groupId] = this.convertConsumptionRate(Number(year), groupId);
            const groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue().filter(meter => meter.groupId == groupId);
            if(groupMeters.length > 0){
              this.convertedCostDataTable[year][groupId] = convertConsumptionRate(groupMeters[0], cost, finalUnit, this.selectedAnalysisItem.analysisCategory);
            }
          }
        }

      }
    }
  }
  
  setYears() {
    let baselineYear = this.selectedAnalysisItem.baselineYear;
    let reportYear = this.reportSettings.reportYear;
    this.years = [];
    for (let year = baselineYear; year <= reportYear; year++) {
      this.years.push(year);
    }
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
          this.setGroupSavings();
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
    }
  }

  setGroupSavings() {
    if (this.groupSummaries) {
      this.groupSummaries.forEach(groupSummary => {
        const groupId = groupSummary.group.idbGroupId;
        const annualAnalysisSummaryData = groupSummary.annualAnalysisSummaryData;
        annualAnalysisSummaryData.forEach(summary => {
          const year = summary.year;
          const savings = summary.savings;
          const cumulativeSavings = summary.cummulativeSavings;
          if (!this.savingsDataTable[year]) {
            this.savingsDataTable[year] = {};
          }
          this.savingsDataTable[year][groupId] = savings;
          if (!this.cumulativeSavingsDataTable[year]) {
            this.cumulativeSavingsDataTable[year] = {};
          }
          this.cumulativeSavingsDataTable[year][groupId] = cumulativeSavings;
        });
      });
    }
  }

  calculateCostSavings(year: number, groupId: string): number {
    if (this.savingsDataTable[year] && this.savingsDataTable[year][groupId] !== undefined && !isNaN(this.savingsDataTable[year][groupId]) &&
      this.convertedCostDataTable[year] && this.convertedCostDataTable[year][groupId] !== undefined && !isNaN(this.convertedCostDataTable[year][groupId])) {
      return this.savingsDataTable[year][groupId] * this.convertedCostDataTable[year][groupId];
    }
    return 0;
  }

  calculateCumulativeCostSavings(year: number, groupId: string): number {
    if (this.cumulativeSavingsDataTable[year] && this.cumulativeSavingsDataTable[year][groupId] !== undefined && !isNaN(this.cumulativeSavingsDataTable[year][groupId]) &&
      this.convertedCostDataTable[year] && this.convertedCostDataTable[year][groupId] !== undefined && !isNaN(this.convertedCostDataTable[year][groupId])) {
      return this.cumulativeSavingsDataTable[year][groupId] * this.convertedCostDataTable[year][groupId];
    }
    return 0;
  }
}

type YearGroupData = { [year: number]: { [groupId: string]: number } };


import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CostSavingsReportSettings, IdbFacilityReport, MonthlyGroupData, YearGroupData } from 'src/app/models/idbModels/facilityReport';
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
import { FacilityCostSavingsReportResults } from 'src/app/calculations/cost-savings-report-calculations/facilityCostSavingsReportResults';

@Component({
  selector: 'app-facility-cost-savings-report-results',
  standalone: false,
  templateUrl: './facility-cost-savings-report-results.component.html',
  styleUrl: './facility-cost-savings-report-results.component.css',
})
export class FacilityCostSavingsReportResultsComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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
      this.costDataTable = this.reportSettings.unitCostTable;
      this.convertedCostDataTable = JSON.parse(JSON.stringify(this.reportSettings.unitCostTable));
      this.convertToRequiredUnit();
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
    if (this.selectedAnalysisItem?.analysisCategory == 'energy') {
      this.finalUnit = this.selectedAnalysisItem.energyUnit;
    }
    else if (this.selectedAnalysisItem?.analysisCategory == 'water') {
      this.finalUnit = this.selectedAnalysisItem.waterUnit;
    }
    for (const year in this?.convertedCostDataTable) {
      for (const groupId in this?.convertedCostDataTable[year]) {
        const cost = this.convertedCostDataTable[year][groupId];
        const originalUnit = this.groupUnits[groupId];
        if (originalUnit == this.finalUnit || cost == null || originalUnit == null)
          continue;

        const groupMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()].filter(meter => meter.groupId == groupId);
        if (groupMeters.length > 0) {
          this.convertedCostDataTable[year][groupId] = convertConsumptionRate(groupMeters[0], cost, this.finalUnit, this.selectedAnalysisItem?.analysisCategory);
        }
      }
    }
  }

  setYears() {
    this.years = getYearsArray(this.selectedAnalysisItem?.baselineYear, this.reportSettings.endYear);
  }

  getGroupSummaries() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.facility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (this.selectedAnalysisItem?.facilityId));
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(this.selectedAnalysisItem?.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(this.selectedAnalysisItem?.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(this.selectedAnalysisItem?.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(this.selectedAnalysisItem?.facilityId);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../../web-workers/facility-cost-savings-report.worker', import.meta.url));
      this.worker = worker;
      worker.onmessage = ({ data }) => {
        if (worker !== this.worker) {
          return;
        }
        worker.terminate();
        this.worker = null;
        if (!data.error) {
          this.groupSummaries = data.groupSummaries;
          this.setSavings();
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
      worker.postMessage(workerMessage);
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.selectedAnalysisItem?.energyIsSource, neededUnits: getNeededUnits(this.selectedAnalysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
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

    const results = new FacilityCostSavingsReportResults(this.groupSummaries, this.convertedCostDataTable, this.reportSettings);
    this.costSavingsTable = results.costSavingsTable;
    this.cumulativeCostSavingsTable = results.cumulativeCostSavingsTable;
    this.estimatedEnergyCostTable = results.estimatedEnergyCostTable;
    this.expectedEnergyCostTable = results.expectedEnergyCostTable;
    this.energyUseTable = results.energyUseTable;
    this.adjustedEnergyUseTable = results.adjustedEnergyUseTable;
    this.energySavingsTable = results.energySavingsTable;

    this.monthKeys = results.monthKeys;
    this.monthlyCostSavingsTable = results.monthlyCostSavingsTable;
    this.cumulativeMonthlyCostSavingsTable = results.cumulativeMonthlyCostSavingsTable;
    this.estimatedMonthlyEnergyCostTable = results.estimatedMonthlyEnergyCostTable;
    this.expectedMonthlyEnergyCostTable = results.expectedMonthlyEnergyCostTable;
    this.monthlyEnergyUseTable = results.monthlyEnergyUseTable;
    this.monthlyAdjustedEnergyUseTable = results.monthlyAdjustedEnergyUseTable;
    this.monthlyEnergySavingsTable = results.monthlyEnergySavingsTable;
  }

  get filteredGroups() {
    return this.selectedAnalysisItem?.groups.filter(group => group.analysisType != 'skip' && group.analysisType != 'skipAnalysis') ?? [];
  }
}

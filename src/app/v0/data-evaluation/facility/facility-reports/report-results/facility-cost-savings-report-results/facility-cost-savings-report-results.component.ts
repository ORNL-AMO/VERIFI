import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject, Injector, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CostSavingsReportSettings, IdbFacilityReport, MonthlyGroupData, YearGroupData } from '@data/models/idbModels/facilityReport';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AnnualFacilityAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { convertConsumptionRate, getYearsArray } from '@shared/sharedHelperFunctions';
import { FacilityCostSavingsReportResults } from '@domain/calculations/cost-savings-report-calculations/facilityCostSavingsReportResults';
import { FacilityCostSavingsReportAdapter } from './facility-cost-savings-report.adapter';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { AnnualSavingsGraphComponent } from './annual-savings-graph/annual-savings-graph.component';
import { MonthlySavingsGraphComponent } from './monthly-savings-graph/monthly-savings-graph.component';
import { AnnualActualVsAdjustedCostsGraphComponent } from './annual-actual-vs-adjusted-costs-graph/annual-actual-vs-adjusted-costs-graph.component';

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
  isExportingPdf: boolean = false;

  @ViewChild('annualSavingsGraph') annualSavingsGraph: AnnualSavingsGraphComponent;
  @ViewChild('monthlySavingsGraph') monthlySavingsGraph: MonthlySavingsGraphComponent;
  @ViewChild('cumulativeAnnualSavingsGraph') cumulativeAnnualSavingsGraph: AnnualSavingsGraphComponent;
  @ViewChild('cumulativeMonthlySavingsGraph') cumulativeMonthlySavingsGraph: MonthlySavingsGraphComponent;
  @ViewChildren('groupComparisonGraph') groupComparisonGraphs!: QueryList<AnnualActualVsAdjustedCostsGraphComponent>;

  constructor(
    private injector: Injector,
    private exportReportPdfService: ExportReportPdfService,
    private facilityCostSavingsReportAdapter: FacilityCostSavingsReportAdapter

  ) { }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
      this.selectedAnalysisItem = this.accountWorkspaceQuery.getFacilityAnalysisByGuid(this.facilityReport.analysisItemId);
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

    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    this.facility = this.accountWorkspaceStore.selectedFacility();
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(this.selectedAnalysisItem?.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(this.selectedAnalysisItem?.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(this.selectedAnalysisItem?.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(this.selectedAnalysisItem?.facilityId);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../../../platform/web-workers/facility-cost-savings-report.worker', import.meta.url));
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

  async onExportPdf() {
    if (!this.facilityReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.facilityCostSavingsReportAdapter.buildDocument({
        facilityReport: this.facilityReport,
        facility: this.facility,
        years: this.years,
        filteredGroups: this.filteredGroups,
        costSavingsTable: this.costSavingsTable,
        monthlyCostSavingsTable: this.monthlyCostSavingsTable,
        monthKeys: this.monthKeys,
        cumulativeCostSavingsTable: this.cumulativeCostSavingsTable,
        cumulativeMonthlyCostSavingsTable: this.cumulativeMonthlyCostSavingsTable,
        costDataTable: this.costDataTable,
        groupUnits: this.groupUnits,
        convertedCostDataTable: this.convertedCostDataTable,
        finalUnit: this.finalUnit,
        estimatedEnergyCostTable: this.estimatedEnergyCostTable,
        expectedEnergyCostTable: this.expectedEnergyCostTable,
        energyUseTable: this.energyUseTable,
        adjustedEnergyUseTable: this.adjustedEnergyUseTable,
        energySavingsTable: this.energySavingsTable,
        monthlyEnergyUseTable: this.monthlyEnergyUseTable,
        adjustedMonthlyEnergyUseTable: this.monthlyAdjustedEnergyUseTable,
        monthlyEnergySavingsTable: this.monthlyEnergySavingsTable,
        estimatedMonthlyEnergyCostTable: this.estimatedMonthlyEnergyCostTable,
        expectedMonthlyEnergyCostTable: this.expectedMonthlyEnergyCostTable,
        chartImageProviders: this.getChartImageProviders()
      });

      await this.exportReportPdfService.export(document, `${this.facilityReport.name} - Cost Savings Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  getChartImageProviders() {
    return {
      annualCostSavingsGraph: async () => this.annualSavingsGraph?.getAnnualSavingsChartAsBase64Image() ?? '',
      monthlyCostSavingsGraph: async () => this.monthlySavingsGraph?.getMonthlySavingsChartAsBase64Image() ?? '',
      cumulativeAnnualCostSavingsGraph: async () => this.cumulativeAnnualSavingsGraph?.getAnnualSavingsChartAsBase64Image() ?? '',
      cumulativeMonthlyCostSavingsGraph: async () => this.cumulativeMonthlySavingsGraph?.getMonthlySavingsChartAsBase64Image() ?? '',
      groupComparisonGraph: this.getGroupComparisonGraphProvider()
    };
  }

   getGroupComparisonGraphProvider(): Record<string, () => Promise<string>> {
    const providers: Record<string, () => Promise<string>> = {};
    if (this.groupComparisonGraphs) {
      this.groupComparisonGraphs.forEach((graphComponent, index) => {
        const groupId = this.filteredGroups[index].idbGroupId;
        providers[groupId] = async () => graphComponent.getComparisonChartAsBase64Image() ?? '';
      });
    }
    return providers;
  }
}

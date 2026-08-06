import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, output, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AnnualFacilityAnalysisReportComponent } from './annual-facility-analysis-report/annual-facility-analysis-report.component';
import { MonthlyFacilityAnalysisReportComponent } from './monthly-facility-analysis-report/monthly-facility-analysis-report.component';
import { GroupAnalysisReportComponent } from './group-analysis-report/group-analysis-report.component';

@Component({
  selector: 'app-facility-analysis-report',
  templateUrl: './facility-analysis-report.component.html',
  styleUrl: './facility-analysis-report.component.css',
  standalone: false
})
export class FacilityAnalysisReportComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input()
  inQuickReport: boolean;

  worker: Worker;
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  reportYear: number;

  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>
  calculating: boolean | 'error' = false;
  facility: IdbFacility;

  onAnalysisDataEmit = output<{
    facility: IdbFacility,
    annualAnalysisSummaries: Array<AnnualAnalysisSummary>,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    groupSummaries: Array<{
      group: AnalysisGroup,
      monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
      annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
    }>
  }>();

  @ViewChild(AnnualFacilityAnalysisReportComponent) annualFacilityAnalysisReportComponent?: AnnualFacilityAnalysisReportComponent;
  @ViewChild(MonthlyFacilityAnalysisReportComponent) monthlyFacilityAnalysisReportComponent?: MonthlyFacilityAnalysisReportComponent;
  @ViewChild(GroupAnalysisReportComponent) groupAnalysisReportComponent?: GroupAnalysisReportComponent;
  @ViewChildren(GroupAnalysisReportComponent) groupAnalysisReportComponents !: QueryList<GroupAnalysisReportComponent>;


  ngOnInit(): void {
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    this.facility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (this.analysisItem.facilityId));
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(this.analysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(this.analysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(this.analysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(this.analysisItem.facilityId);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.reportYear = this.analysisReportSettings.reportYear;
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.annualAnalysisSummaries = data.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
          this.groupSummaries = data.groupSummaries;
          this.reportYear = data.reportYear;
          if (this.inQuickReport) {
            this.analysisReportSettings.reportYear = this.reportYear;
          }
          this.calculating = false;
          this.onAnalysisDataEmit.emit({
            facility: this.facility,
            annualAnalysisSummaries: this.annualAnalysisSummaries,
            monthlyAnalysisSummaryData: this.monthlyAnalysisSummaryData,
            groupSummaries: this.groupSummaries
          });
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      this.worker.postMessage({
        analysisItem: this.analysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
        reportYear: this.reportYear
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(
        this.analysisItem,
        this.facility,
        calanderizedMeters,
        accountPredictorEntries,
        false,
        accountPredictors,
        undefined,
        true,
        { reportYear: this.reportYear }
      );
      this.annualAnalysisSummaries = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      this.monthlyAnalysisSummaryData = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.groupSummaries = annualAnalysisSummaryClass.groupSummaries;
      this.reportYear = annualAnalysisSummaryClass.reportYear;
      if (this.inQuickReport) {
        this.analysisReportSettings.reportYear = this.reportYear;
      }
      this.onAnalysisDataEmit.emit({
        facility: this.facility,
        annualAnalysisSummaries: this.annualAnalysisSummaries,
        monthlyAnalysisSummaryData: this.monthlyAnalysisSummaryData,
        groupSummaries: this.groupSummaries
      });
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  getEnergyIntensityChartProvider() {
    return async () => {
      if (this.annualFacilityAnalysisReportComponent) {
        return await this.annualFacilityAnalysisReportComponent.getEnergyIntensityChart();
      }
      return '';
    };
  }

  getPercentImprovementChartProvider() {
    return async () => {
      if (this.annualFacilityAnalysisReportComponent) {
        return await this.annualFacilityAnalysisReportComponent.getPercentImprovementChart();
      }
      return '';
    };
  }

  getMonthlyAnalysisGraphProvider() {
    return async () => {
      if (this.monthlyFacilityAnalysisReportComponent) {
        return await this.monthlyFacilityAnalysisReportComponent.getMonthlyAnalysisGraph();
      }
      return '';
    };
  }

  getMonthlyAnalysisSavingsGraphProvider() {
    return async () => {
      if (this.monthlyFacilityAnalysisReportComponent) {
        return await this.monthlyFacilityAnalysisReportComponent.getMonthlyAnalysisSavingsGraph();
      }
      return '';
    };
  }

  getGroupModelGraphProvider() {
    const providers: Record<string, () => Promise<string>> = {};
    this.groupAnalysisReportComponents?.forEach(groupReportComponent => {
      providers[groupReportComponent.getGroupId()] = async () => {
        return await groupReportComponent.getGroupGraphImage();
      };
    });
    return providers;
  }

  getGroupAnnualEnergyIntensityChartProvider() {
    const providers: Record<string, () => Promise<string>> = {};
    this.groupAnalysisReportComponents?.forEach(groupReportComponent => {
      providers[groupReportComponent.getGroupId()] = async () => {
        return await groupReportComponent.getGroupAnnualEnergyIntensityChart();
      };
    });
    return providers;
  }

  getGroupAnnualPercentImprovementChartProvider() {
    const providers: Record<string, () => Promise<string>> = {};
    this.groupAnalysisReportComponents?.forEach(groupReportComponent => {
      providers[groupReportComponent.getGroupId()] = async () => {
        return await groupReportComponent.getGroupAnnualPercentImprovementChart();
      };
    });
    return providers;
  }

  getGroupMonthlyAnalysisGraphProvider() {
    const providers: Record<string, () => Promise<string>> = {};
    this.groupAnalysisReportComponents?.forEach(groupReportComponent => {
      providers[groupReportComponent.getGroupId()] = async () => {
        return await groupReportComponent.getGroupMonthlyAnalysisGraph();
      };
    });
    return providers;
  }

  getGroupMonthlyAnalysisSavingsGraphProvider() {
    const providers: Record<string, () => Promise<string>> = {};
    this.groupAnalysisReportComponents?.forEach(groupReportComponent => {
      providers[groupReportComponent.getGroupId()] = async () => {
        return await groupReportComponent.getGroupMonthlyAnalysisSavingsGraph();
      };
    });
    return providers;
  }
}

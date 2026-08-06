import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-banked-group-results-table',
  templateUrl: './banked-group-results-table.component.html',
  styleUrl: './banked-group-results-table.component.css',
  standalone: false
})
export class BankedGroupResultsTableComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedGroupSub: Subscription;
  selectedGroup: AnalysisGroup;
  analysisItemSub: Subscription;
  bankedAnalysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean | 'error' = true;
  worker: Worker;
  groupSummary: {
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  };
  modelYear: number;
  bankedSavings: number;
  constructor(
    private analysisService: AnalysisService,
    private injector: Injector

  ) {

  }

  ngOnInit() {
    this.analysisItemSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalysis, { injector: this.injector }).subscribe(val => {
      let analysisItem: IdbAnalysisItem = val;
      this.bankedAnalysisItem = this.accountWorkspaceQuery.getFacilityAnalysisByGuid(analysisItem.bankedAnalysisItemId);
    })
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
      this.setModelYear();
      if (!this.groupSummary || this.groupSummary.group.idbGroupId != this.selectedGroup.idbGroupId) {
        this.runAnalysis();
      } else {
        this.setBankedSavings();
      }
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
    this.analysisItemSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  runAnalysis() {
    this.calculating = true;
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    this.facility = this.accountWorkspaceQuery.getFacilityByGuid(this.bankedAnalysisItem.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(this.bankedAnalysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(this.bankedAnalysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(this.bankedAnalysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(this.bankedAnalysisItem.facilityId);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    // this.bankedAnalysisItem.reportYear = this.selectedGroup.bankedAnalysisYear;
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../../web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.groupSummary = data.groupSummaries.find(summary => {
            return summary.group.idbGroupId == this.selectedGroup.idbGroupId;
          });
          this.calculating = false;
          this.setBankedSavings();
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      this.worker.postMessage({
        analysisItem: this.bankedAnalysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
        reportYear: this.selectedGroup.bankedAnalysisYear
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.bankedAnalysisItem.energyIsSource, neededUnits: getNeededUnits(this.bankedAnalysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(
        this.bankedAnalysisItem,
        this.facility,
        calanderizedMeters,
        accountPredictorEntries,
        false,
        accountPredictors,
        undefined,
        true,
        { reportYear: this.selectedGroup.bankedAnalysisYear }
      );
      this.groupSummary = annualAnalysisSummaryClass.groupSummaries.find(summary => {
        return summary.group.idbGroupId == this.selectedGroup.idbGroupId;
      });
      this.setBankedSavings();
    }
  }

  setModelYear() {
    let bankedAnalysisGroup: AnalysisGroup = this.bankedAnalysisItem.groups.find(group => {
      return group.idbGroupId == this.selectedGroup.idbGroupId;
    })
    if (bankedAnalysisGroup.analysisType == 'regression') {
      this.modelYear = bankedAnalysisGroup.regressionModelYear;
    } else {
      this.modelYear = undefined;
    }
  }

  setBankedSavings() {
    let bankedSavingsYear: AnnualAnalysisSummary = this.groupSummary.annualAnalysisSummaryData.find(summaryData => {
      return summaryData.year == this.selectedGroup.bankedAnalysisYear;
    });
    if (bankedSavingsYear) {
      this.bankedSavings = bankedSavingsYear.totalSavingsPercentImprovement;
    }
  }
}

import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { AnnualFacilityAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisReportSettings, getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';
import { IdbAccount } from '@data/models/idbModels/account';
import { isBankedGroupConfigurationComplete } from '@shared/shared-analysis/banking-configuration';

@Component({
    selector: 'app-banked-group-analysis',
    templateUrl: './banked-group-analysis.component.html',
    styleUrl: './banked-group-analysis.component.css',
    standalone: false
})
export class BankedGroupAnalysisComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedGroupSub: Subscription;
  selectedGroup: AnalysisGroup;
  analysisItemSub: Subscription;
  analysisItem: IdbAnalysisItem;
  bankedAnalysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean | 'error' = true;
  worker: Worker;
  groupSummary: {
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  };
  analysisReportSettings: AnalysisReportSettings;
  configurationIncomplete: boolean = false;
  constructor(
    private analysisService: AnalysisService,
    private injector: Injector

  ) {

  }

  ngOnInit() {
    this.setReportSettings();
    this.analysisItemSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalysis, { injector: this.injector }).subscribe(val => {
      this.analysisItem = val;
      this.bankedAnalysisItem = val?.bankedAnalysisItemId
        ? this.accountWorkspaceQuery.getFacilityAnalysisByGuid(val.bankedAnalysisItemId)
        : undefined;
      this.refreshAnalysis();
    })
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
      this.refreshAnalysis();
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
    this.analysisItemSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  setReportSettings() {
    this.analysisReportSettings = getAnalysisReportSettings()
    this.analysisReportSettings.groupMonthlyResultsTable = false;
    this.analysisReportSettings.groupMonthlyResultsTableReportYear = false;
  }

  runAnalysis() {
    const selectedGroup = this.selectedGroup;
    const bankedAnalysisItem = this.bankedAnalysisItem;
    if (!selectedGroup || !bankedAnalysisItem) {
      return;
    }
    if (this.worker) {
      this.worker.terminate();
    }
    this.calculating = true;
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    this.facility = this.accountWorkspaceQuery.getFacilityByGuid(bankedAnalysisItem.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.accountWorkspaceQuery.getFacilityMeters(bankedAnalysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(bankedAnalysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(bankedAnalysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(bankedAnalysisItem.facilityId);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    // this.bankedAnalysisItem.reportYear = this.selectedGroup.bankedAnalysisYear;
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../../../../platform/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker = worker;
      worker.onmessage = ({ data }) => {
        worker.terminate();
        if (this.worker !== worker) {
          return;
        }
        this.worker = undefined;
        if (!data.error) {
          this.groupSummary = data.groupSummaries.find(summary => {
            return summary.group.idbGroupId == selectedGroup.idbGroupId;
          });
          this.calculating = false;
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      worker.postMessage({
        analysisItem: bankedAnalysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
        reportYear: selectedGroup.bankedAnalysisYear
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: bankedAnalysisItem.energyIsSource, neededUnits: getNeededUnits(bankedAnalysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(
        bankedAnalysisItem,
        this.facility,
        calanderizedMeters,
        accountPredictorEntries,
        false,
        accountPredictors,
        undefined,
        true,
        { reportYear: selectedGroup.bankedAnalysisYear }
      );
      this.groupSummary = annualAnalysisSummaryClass.groupSummaries.find(summary => {
        return summary.group.idbGroupId == selectedGroup.idbGroupId;
      });
      this.calculating = false;
    }
  }

  private refreshAnalysis() {
    if (!this.analysisItem || !this.selectedGroup) {
      return;
    }

    this.configurationIncomplete = !isBankedGroupConfigurationComplete(
      this.analysisItem,
      this.selectedGroup,
      this.bankedAnalysisItem
    );
    if (this.configurationIncomplete) {
      if (this.worker) {
        this.worker.terminate();
        this.worker = undefined;
      }
      this.calculating = false;
      this.groupSummary = undefined;
      return;
    }

    this.runAnalysis();
  }
}

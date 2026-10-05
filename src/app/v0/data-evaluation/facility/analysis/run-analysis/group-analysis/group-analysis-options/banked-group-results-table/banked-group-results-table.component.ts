import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AnnualFacilityAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-banked-group-results-table',
  templateUrl: './banked-group-results-table.component.html',
  styleUrl: './banked-group-results-table.component.css',
  standalone: false
})
export class BankedGroupResultsTableComponent implements OnChanges {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input() selectedGroup: AnalysisGroup;
  @Input() bankedAnalysisItem: IdbAnalysisItem;

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

  ngOnChanges(_changes: SimpleChanges) {
    if (!this.selectedGroup || !this.bankedAnalysisItem) {
      this.resetResults();
      return;
    }

    const bankedAnalysisGroup = this.bankedAnalysisItem.groups?.find(group =>
      group.idbGroupId === this.selectedGroup.idbGroupId
    );
    if (!bankedAnalysisGroup
      || !Number.isFinite(this.selectedGroup.bankedAnalysisYear)
      || !Number.isFinite(this.selectedGroup.newBaselineYear)
      || this.selectedGroup.bankedAnalysisYear >= this.selectedGroup.newBaselineYear) {
      this.resetResults();
      return;
    }

    this.setModelYear(bankedAnalysisGroup);
    if (!this.groupSummary || this.groupSummary.group.idbGroupId !== this.selectedGroup.idbGroupId) {
      this.runAnalysis();
    } else {
      this.setBankedSavings();
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  runAnalysis() {
    const selectedGroup = this.selectedGroup;
    const bankedAnalysisItem = this.bankedAnalysisItem;
    if (!selectedGroup || !bankedAnalysisItem) {
      this.resetResults();
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
      const worker = new Worker(new URL('../../../../../../../../platform/web-workers/annual-facility-analysis.worker', import.meta.url));
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
          this.setBankedSavings();
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
      this.setBankedSavings();
    }
  }

  setModelYear(bankedAnalysisGroup: AnalysisGroup) {
    if (bankedAnalysisGroup.analysisType == 'regression') {
      this.modelYear = bankedAnalysisGroup.regressionModelYear;
    } else {
      this.modelYear = undefined;
    }
  }

  setBankedSavings() {
    this.bankedSavings = undefined;
    let bankedSavingsYear: AnnualAnalysisSummary = this.groupSummary?.annualAnalysisSummaryData.find(summaryData => {
      return summaryData.year == this.selectedGroup.bankedAnalysisYear;
    });
    if (bankedSavingsYear) {
      this.bankedSavings = bankedSavingsYear.totalSavingsPercentImprovement;
    }
  }

  private resetResults() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    this.groupSummary = undefined;
    this.facility = undefined;
    this.modelYear = undefined;
    this.bankedSavings = undefined;
    this.calculating = false;
  }
}

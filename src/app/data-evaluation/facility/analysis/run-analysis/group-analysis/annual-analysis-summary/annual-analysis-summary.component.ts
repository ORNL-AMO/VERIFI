import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnnualGroupAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-annual-analysis-summary',
    templateUrl: './annual-analysis-summary.component.html',
    styleUrls: ['./annual-analysis-summary.component.css'],
    standalone: false
})
export class AnnualAnalysisSummaryComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  worker: Worker;
  calculating: boolean | 'error';
  analysisDisplay: 'table' | 'graph';
  key: string;
  facilitySub: Subscription;

  constructor(
    private analysisService: AnalysisService,
    private injector: Injector
  ) {
  }

  ngOnInit(): void {
    this.analysisItem = this.accountWorkspaceStore.selectedFacilityAnalysis();
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    this.group = this.analysisService.selectedGroup.getValue();

    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(val => {
      this.facility = val;
      this.key = 'annual-' + this.facility?.id;
      this.analysisDisplay = this.analysisService.getDisplaySubject(this.key, 'table').getValue();
    });

    let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let accountPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../web-workers/annual-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.annualAnalysisSummary = data.annualAnalysisSummaries;
          this.calculating = false;
        } else {
          this.annualAnalysisSummary = undefined;
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: this.group,
        analysisItem: this.analysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(this.group, this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, undefined, accountPredictors, accountAnalysisItems);
      this.annualAnalysisSummary = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      this.calculating = false;
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.facilitySub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay = display;
    this.analysisService.getDisplaySubject(this.key, 'table').next(this.analysisDisplay);
  }
}

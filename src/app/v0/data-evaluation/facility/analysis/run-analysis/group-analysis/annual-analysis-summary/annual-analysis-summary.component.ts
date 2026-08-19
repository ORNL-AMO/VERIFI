import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, DestroyRef, Signal, computed, effect, inject, signal } from '@angular/core';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnnualAnalysisSummary } from '@app/models/analysis';
import { CalanderizedMeter } from '@app/models/calanderization';
import { AnnualGroupAnalysisSummaryClass } from '@app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@app/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from '@app/models/idbModels/facility';
import { IdbAnalysisItem } from '@app/models/idbModels/analysisItem';

@Component({
    selector: 'app-annual-analysis-summary',
    templateUrl: './annual-analysis-summary.component.html',
    styleUrls: ['./annual-analysis-summary.component.css'],
    standalone: false
})
export class AnnualAnalysisSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  readonly facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  readonly selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);

  readonly key: Signal<string> = computed(() => 'annual-' + this.facility()?.id);
  readonly analysisDisplay = signal<'table' | 'graph'>('table');

  readonly annualAnalysisSummary = signal<Array<AnnualAnalysisSummary>>(undefined);
  readonly calculating = signal<boolean | 'error'>(false);

  private worker: Worker;

  constructor() {
    effect(() => {
      const key = this.key();
      this.analysisDisplay.set(this.analysisService.getDisplaySubject(key, 'table').getValue());
    });

    const analysisItem = this.analysisItem();
    const facility = this.facility();
    const group = this.selectedGroup();
    const facilityMeters = [...this.accountWorkspaceStore.facilityMeters()];
    const facilityMeterData = [...this.accountWorkspaceStore.facilityMeterData()];
    const accountPredictorEntries = [...this.accountWorkspaceStore.predictorData()];
    const accountPredictors = [...this.accountWorkspaceStore.predictors()];
    const accountAnalysisItems = [...this.accountWorkspaceStore.facilityAnalyses()];
    const account = this.accountWorkspaceStore.account();

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../web-workers/annual-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.annualAnalysisSummary.set(data.annualAnalysisSummaries);
          this.calculating.set(false);
        } else {
          this.annualAnalysisSummary.set(undefined);
          this.calculating.set('error');
        }
        this.worker.terminate();
      };
      this.calculating.set(true);
      this.worker.postMessage({
        selectedGroup: group,
        analysisItem: analysisItem,
        facility: facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facility, false, { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) }, [], [], [facility], account.assessmentReportVersion, []);
      const annualAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, accountPredictorEntries, undefined, accountPredictors, accountAnalysisItems);
      this.annualAnalysisSummary.set(annualAnalysisSummaryClass.getAnnualAnalysisSummaries());
      this.calculating.set(false);
    }

    this.destroyRef.onDestroy(() => {
      if (this.worker) {
        this.worker.terminate();
      }
    });
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay.set(display);
    this.analysisService.getDisplaySubject(this.key(), 'table').next(display);
  }
}

import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, DestroyRef, Signal, computed, effect, inject, signal } from '@angular/core';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, MonthlyAnalysisSummary } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { MonthlyAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

@Component({
  selector: 'app-monthly-analysis-summary',
  templateUrl: './monthly-analysis-summary.component.html',
  styleUrls: ['./monthly-analysis-summary.component.css'],
  standalone: false
})
export class MonthlyAnalysisSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly analysisService = inject(AnalysisService);
  private readonly sharedDataService = inject(SharedDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  readonly facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  readonly selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  readonly itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);

  readonly key: Signal<string> = computed(() => 'monthly-' + this.facility()?.id);
  readonly analysisDisplay = signal<'graph' | 'table'>('graph');

  readonly monthlyAnalysisSummary = signal<MonthlyAnalysisSummary>(undefined);
  readonly calculating = signal<boolean | 'error'>(false);

  private worker: Worker;

  constructor() {
    effect(() => {
      const key = this.key();
      this.analysisDisplay.set(this.analysisService.getDisplaySubject(key, 'graph').getValue());
    });

    const analysisItem = this.analysisItem();
    const facility = this.facility();
    const group = this.selectedGroup();
    const facilityMeters = [...this.accountWorkspaceStore.facilityMeters()];
    const facilityMeterData = [...this.accountWorkspaceStore.facilityMeterData()];
    const accountPredictorEntries = [...this.accountWorkspaceStore.predictorData()];
    const accountAnalysisItems = [...this.accountWorkspaceStore.facilityAnalyses()];
    const account = this.accountWorkspaceStore.account();

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../../platform/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.monthlyAnalysisSummary.set(data.monthlyAnalysisSummary);
          this.calculating.set(false);
        } else {
          this.monthlyAnalysisSummary.set(undefined);
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
        accountAnalysisItems: accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      // Web Workers are not supported in this environment.
      const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facility, false, { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) }, [], [], [facility], account.assessmentReportVersion, []);
      const monthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, accountPredictorEntries, false, accountAnalysisItems);
      this.monthlyAnalysisSummary.set(monthlyAnalysisSummaryClass.getResults());
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
    this.analysisService.getDisplaySubject(this.key(), 'graph').next(display);
  }
}

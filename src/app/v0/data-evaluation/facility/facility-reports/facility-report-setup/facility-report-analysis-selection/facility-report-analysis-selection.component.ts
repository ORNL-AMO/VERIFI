import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, EventEmitter, Input, Output, inject, WritableSignal, signal, Signal, computed, effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AnalysisStatusCheck } from '@app/domain/calculations/status-check-calculations/analysisStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from '@app/shared/helper-services/account-status-check.service';

interface AnalysisItemListRow {
  analysisItem: IdbAnalysisItem;
  statusCheck?: AnalysisStatusCheck;
}
@Component({
  selector: 'app-facility-report-analysis-selection',
  standalone: false,
  templateUrl: './facility-report-analysis-selection.component.html',
  styleUrl: './facility-report-analysis-selection.component.css',
})
export class FacilityReportAnalysisSelectionComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private router = inject(Router);
  private accountStatusCheckService = inject(AccountStatusCheckService);

  @Input()
  facilityReport: IdbFacilityReport;
  @Input()
  baselineYears: Array<number>;

  private selectedAnalysisItemState: WritableSignal<IdbAnalysisItem | undefined> = signal(undefined)

  @Input()
  get selectedAnalysisItem(): IdbAnalysisItem | undefined {
    return this.selectedAnalysisItemState();
  }
  set selectedAnalysisItem(item: IdbAnalysisItem | undefined) {
    this.selectedAnalysisItemState.set(item);
  }
  
  facilityStatusCheck = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$, { initialValue: undefined });
  selectedBaselineYear: WritableSignal<number | 'All'> = signal('All');
  selectedCategory: WritableSignal<'All' | 'energy' | 'water'> = signal('All');
  hasDataChanged: WritableSignal<boolean> = signal(false);

  analysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => {
    const items = [...this.accountWorkspaceStore.selectedFacilityAnalyses()];
    if (this.facilityReport.facilityReportType == 'costSavings') {
      return items.filter(item => (item.analysisCategory == 'water') || (item.analysisCategory == 'energy' && !item.energyIsSource));
    }
    return items;
  });

  filteredAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => {
    let filtered = [...this.analysisItems()];
    const year = this.selectedBaselineYear();
    const category = this.selectedCategory();

    if (year != 'All') {
      filtered = filtered.filter(item => item.baselineYear == year);
    }
    if (category != 'All') {
      filtered = filtered.filter(item => item.analysisCategory == category);
    }
    
    return filtered;
  });

  filteredAnalysisTableRows: Signal<Array<AnalysisItemListRow>> = computed(() => {
    const filtered = this.filteredAnalysisItems();
    const facilityStatus = this.facilityStatusCheck();

    let tableItems: Array<AnalysisItemListRow> = [];
    filtered.forEach(item => {
      const statusCheck = facilityStatus.analysisStatusChecks.find(check => check.analysisItem.guid === item.guid);
      tableItems.push({
        analysisItem: item,
        statusCheck: statusCheck
      });
    });
    return tableItems;
  });

  @Output()
  selectedAnalysisItemChange: EventEmitter<IdbAnalysisItem> = new EventEmitter<IdbAnalysisItem>();
  @Output()
  filteredItemsChange: EventEmitter<Array<IdbAnalysisItem>> = new EventEmitter<Array<IdbAnalysisItem>>();

  constructor() {
    effect(() => {
      this.filteredItemsChange.emit(this.filteredAnalysisItems());
    });

    effect(() => {
      const selectedItem = this.selectedAnalysisItemState();
      if (!selectedItem) {
        this.hasDataChanged.set(false);
        return;
      }
      untracked(() => {
        this.checkModelData(selectedItem);
      });
    });
  }

  onSelectedItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItemChange.emit(item);
  }

  goToAnalysis(item: IdbAnalysisItem) {
    this.accountWorkspaceService.selectFacilityAnalysis((item)?.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facilityReport.facilityId + '/analysis/run-analysis');
  }

  checkModelData(selectedItem: IdbAnalysisItem) {
    this.hasDataChanged.set(false);

    if (!selectedItem?.dataCheckedDate) {
      return;
    }

    const dataCheckDate: Date = new Date(selectedItem?.dataCheckedDate);
    const facilityPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.facilityPredictorData()];
    const predictorDataChanged = facilityPredictorEntries.some(predictor => new Date(predictor.modifiedDate) > dataCheckDate);
    if (predictorDataChanged) {
      this.hasDataChanged.set(true);
      this.saveAnalysisVisitedData(selectedItem);
      return
    }
    const facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    const facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];

    const groupMeters: Array<IdbUtilityMeter> = selectedItem.groups.flatMap(group => {
      return facilityMeters.filter(meter => meter.groupId == group.idbGroupId);
    });
    const groupMeterIds: Array<string> = groupMeters.map(meter => meter.guid);
    const groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => groupMeterIds.includes(meterData.meterId));

    const meterDataChanged = groupMeterData.some(meterData => new Date(meterData.dbDate) > dataCheckDate);
    if (meterDataChanged) {
      this.hasDataChanged.set(true);
      this.saveAnalysisVisitedData(selectedItem);
    }
  }

  async saveAnalysisVisitedData(selectedItem: IdbAnalysisItem) {
    selectedItem.isAnalysisVisited = false;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      {
        entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: this.selectedAnalysisItem.guid, label: 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) }
      },
      () => this.analysisHandler.updateFacilityAnalysis(this.selectedAnalysisItem, activeAccountGuid)
    );
    this.accountWorkspaceService.selectFacilityAnalysis(this.selectedAnalysisItem?.guid);
  }
}

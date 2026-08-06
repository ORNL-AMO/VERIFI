import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Input, Output, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

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

  @Input()
  facilityReport: IdbFacilityReport;
  @Input()
  baselineYears: Array<number>;
  @Input()
  selectedAnalysisItem: IdbAnalysisItem;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;
  selectedBaselineYear: number | 'All' = 'All';
  selectedCategory: string = 'All';
  filteredAnalysisItems: Array<IdbAnalysisItem>;
  hasDataChanged: boolean = false;

  @Output()
  selectedAnalysisItemChange: EventEmitter<IdbAnalysisItem> = new EventEmitter<IdbAnalysisItem>();
  @Output()
  filteredItemsChange: EventEmitter<Array<IdbAnalysisItem>> = new EventEmitter<Array<IdbAnalysisItem>>();

  constructor(
    private router: Router,
    private injector: Injector
  ) { }

  ngOnInit() {
    this.analysisItemsSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalyses, { injector: this.injector }).subscribe(items => {
      this.analysisItems = [...items];
      if (this.facilityReport.facilityReportType == 'costSavings') {
        this.analysisItems = items.filter(item => (item.analysisCategory == 'water') || (item.analysisCategory == 'energy' && !item.energyIsSource));
      }
      this.applyFilters();
    });

    if (this.selectedAnalysisItem) {
      this.checkModelData();
    }
  }

  ngOnDestroy() {
    this.analysisItemsSub.unsubscribe();
  }

  onSelectedItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItemChange.emit(item);
  }

  applyFilters() {
    this.filteredAnalysisItems = [...this.analysisItems];
    if (this.selectedBaselineYear != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.baselineYear == this.selectedBaselineYear });
    }
    if (this.selectedCategory != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.analysisCategory == this.selectedCategory });
    }
    this.filteredItemsChange.emit(this.filteredAnalysisItems);
  }

  onOptionChange() {
    this.applyFilters();
  }

  goToAnalysis(item: IdbAnalysisItem) {
    this.accountWorkspaceService.selectFacilityAnalysis((item)?.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facilityReport.facilityId + '/analysis/run-analysis');
  }

  checkModelData() {
    this.hasDataChanged = false;
    if (this.selectedAnalysisItem?.dataCheckedDate) {
      let dataCheckDate: Date = new Date(this.selectedAnalysisItem?.dataCheckedDate);
      let facilityPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.facilityPredictorData()];

      let hasDataChanged = facilityPredictorEntries.find(predictor => {
        return new Date(predictor.modifiedDate) > dataCheckDate
      });
      if (hasDataChanged) {
        this.hasDataChanged = true;
        this.saveAnalysisVisitedData();
      } else {
        let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
        let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];

        let groupMeters: Array<IdbUtilityMeter> = this.selectedAnalysisItem.groups.flatMap(group => {
          return facilityMeters.filter(meter => meter.groupId == group.idbGroupId);
        });
        let groupMeterIds: Array<string> = groupMeters.map(meter => meter.guid);
        let groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => groupMeterIds.includes(meterData.meterId));

        let hasDataChanged = groupMeterData.some(meterData => new Date(meterData.dbDate) > dataCheckDate);
        if (hasDataChanged) {
          this.hasDataChanged = true;
          this.saveAnalysisVisitedData();
        }
      }
    }
  }

  async saveAnalysisVisitedData() {
    this.selectedAnalysisItem.isAnalysisVisited = false;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: this.selectedAnalysisItem.guid, label: 'Save Facility Analysis' },
      () => this.analysisHandler.updateFacilityAnalysis(this.selectedAnalysisItem, activeAccountGuid)
    );
    this.accountWorkspaceService.selectFacilityAnalysis(this.selectedAnalysisItem?.guid);
  }
}

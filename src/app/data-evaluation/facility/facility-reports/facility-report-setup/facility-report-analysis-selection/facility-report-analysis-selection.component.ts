import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
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
    private analysisDbService: AnalysisDbService,
    private router: Router
  ) { }

  ngOnInit() {
    this.analysisItemsSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalyses).subscribe(items => {
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
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.selectedAnalysisItem));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectFacilityAnalysis((this.selectedAnalysisItem)?.guid);
  }
}

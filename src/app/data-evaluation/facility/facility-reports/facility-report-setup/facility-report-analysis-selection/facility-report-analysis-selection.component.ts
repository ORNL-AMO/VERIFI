import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
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

  constructor(private analysisDbService: AnalysisDbService,
    private router: Router,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit() {
    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
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
    this.analysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facilityReport.facilityId + '/analysis/run-analysis');
  }

  checkModelData() {
    this.hasDataChanged = false;
    if (this.selectedAnalysisItem?.dataCheckedDate) {
      let dataCheckDate: Date = new Date(this.selectedAnalysisItem?.dataCheckedDate);
      let facilityPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();

      let hasDataChanged = facilityPredictorEntries.find(predictor => {
        return new Date(predictor.modifiedDate) > dataCheckDate
      });
      if (hasDataChanged) {
        this.hasDataChanged = true;
        this.saveAnalysisVisitedData();
      } else {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
        let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();

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
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(account, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.selectedAnalysisItem);
  }
}

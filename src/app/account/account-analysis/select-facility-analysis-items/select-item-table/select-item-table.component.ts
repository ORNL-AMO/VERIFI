import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { firstValueFrom } from 'rxjs';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
@Component({
  selector: 'app-select-item-table',
  templateUrl: './select-item-table.component.html',
  styleUrls: ['./select-item-table.component.css']
})
export class SelectItemTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  @Input()
  facilityAnalysisItems: Array<IdbAnalysisItem>;

  selectedFacilityItemId: string;
  itemToEdit: IdbAnalysisItem;
  facilities: Array<IdbFacility>
  showCreateItem: boolean;
  selectedFacilityItem: IdbAnalysisItem;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private router: Router,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private analysisService: AnalysisService,
    private analysisValidationService: AnalysisValidationService,
    private sharedDataService: SharedDataService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictorDbService) { }

  ngOnInit(): void {
    this.facilities = this.facilityDbService.accountFacilities.getValue();
  }

  ngOnChanges() {
    this.setSelectedFacilityItemId();
  }

  setSelectedFacilityItemId() {
    this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.facilityId == this.facility.guid) {
        this.selectedFacilityItemId = item.analysisItemId;
      }
    });
    this.setSelectedFacilityItem();
  }

  async save() {
    await this.accountAnalysisDbService.updateFacilityItemSelection(this.selectedAnalysisItem, this.selectedFacilityItemId, this.facility.guid);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.setSelectedFacilityItem();
  }


  editItem(analysisItem: IdbAnalysisItem) {
    this.sharedDataService.modalOpen.next(true);
    this.itemToEdit = analysisItem;
  }

  cancelEditItem() {
    this.sharedDataService.modalOpen.next(false);
    this.itemToEdit = undefined;
  }

  confirmEditItem() {
    this.sharedDataService.modalOpen.next(false);
    this.analysisService.accountAnalysisItem = this.selectedAnalysisItem;
    this.analysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('facility/' + this.facility.id + '/analysis/run-analysis');
  }

  createNewItem() {
    this.sharedDataService.modalOpen.next(true);
    this.showCreateItem = true;
  }

  cancelCreateNew() {
    this.sharedDataService.modalOpen.next(false);
    this.showCreateItem = false;
  }

  async confirmCreateNew() {
    this.sharedDataService.modalOpen.next(false);
    this.loadingService.setLoadingMessage('Creating Facility Analysis...')
    this.loadingService.setLoadingStatus(true);
    this.showCreateItem = false;
    this.dbChangesService.selectFacility(this.facility);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, this.facility, accountMeterGroups, accountPredictors, this.selectedAnalysisItem.analysisCategory);
    newIdbItem.energyIsSource = this.selectedAnalysisItem.energyIsSource;
    newIdbItem.reportYear = this.selectedAnalysisItem.reportYear;
    newIdbItem = this.analysisService.setDataAdjustments(newIdbItem);
    newIdbItem.groups.forEach(group => {
      group.groupErrors = this.analysisValidationService.getGroupErrors(group);
    });
    newIdbItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(newIdbItem);
    newIdbItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
    this.selectedFacilityItemId = newIdbItem.guid;
    await this.dbChangesService.selectAccount(account, false);
    await this.save();
    this.analysisDbService.selectedAnalysisItem.next(newIdbItem);
    this.loadingService.setLoadingStatus(false);
    this.analysisService.accountAnalysisItem = this.selectedAnalysisItem;
    this.router.navigateByUrl("/facility/" + this.facility.id + "/analysis/run-analysis/analysis-setup");
  }

  setSelectedFacilityItem() {
    if (this.selectedFacilityItemId) {
      let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
      this.selectedFacilityItem = analysisItems.find(item => { return item.guid == this.selectedFacilityItemId });
    } else {
      this.selectedFacilityItem = undefined;
    }

  }
}

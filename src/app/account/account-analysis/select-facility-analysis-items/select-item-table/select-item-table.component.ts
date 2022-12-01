import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisValidationService } from 'src/app/facility/analysis/analysis-validation.service';
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
  selectedItemHasErrors: boolean;
  selectedFacilityItem: IdbAnalysisItem;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private router: Router,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private analysisService: AnalysisService,
    private analysisValidationService: AnalysisValidationService) { }

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
    await this.dbChangesService.setAccountAnalysisItems(account);
    this.setSelectedFacilityItem();
  }


  editItem(analysisItem: IdbAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  confirmEditItem() {
    this.analysisService.accountAnalysisItem = this.selectedAnalysisItem;
    this.analysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('facility/' + this.facility.id + '/analysis/run-analysis');
  }

  createNewItem() {
    this.showCreateItem = true;
  }

  cancelCreateNew() {
    this.showCreateItem = false;
  }

  async confirmCreateNew() {
    this.loadingService.setLoadingMessage('Creating Facility Analysis...')
    this.loadingService.setLoadingStatus(true);
    this.showCreateItem = false;
    this.dbChangesService.selectFacility(this.facility);
    let newIdbItem: IdbAnalysisItem = this.analysisDbService.getNewAnalysisItem();
    newIdbItem.energyIsSource = this.selectedAnalysisItem.energyIsSource;
    newIdbItem.reportYear = this.selectedAnalysisItem.reportYear;
    newIdbItem = this.analysisService.setBaselineAdjustments(this.facility, newIdbItem);
    newIdbItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(newIdbItem);
    newIdbItem = await this.analysisDbService.addWithObservable(newIdbItem).toPromise();
    this.selectedFacilityItemId = newIdbItem.guid;
    await this.save();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(account);
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

import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { firstValueFrom } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';

interface FacilityAnalysisListItem {
  analysisItem: IdbAnalysisItem;
  statusCheck: AnalysisStatusCheck;
}

@Component({
  selector: 'app-select-item-table',
  templateUrl: './select-item-table.component.html',
  styleUrls: ['./select-item-table.component.css'],
  standalone: false
})
export class SelectItemTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private router: Router = inject(Router);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private loadingService: LoadingService = inject(LoadingService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private facilityDbservice: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.accountAnalysisItems);
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  accountAnalysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if (selectedItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(selectedItem.guid);
    }
    return null;
  });

  facilityAnalysisListItems: Signal<Array<FacilityAnalysisListItem>> = computed(() => {
    const allItems = this.allFacilityAnalysisItems();
    const selectedItem = this.selectedAnalysisItem();
    const selectedFacility = this.selectedFacility();
    const accountStatusCheck = this.accountStatusCheck();
    const accountAnalysisStatusCheck = this.accountAnalysisStatusCheck();
    let filteredItems: Array<FacilityAnalysisListItem> = [];
    if (allItems && selectedItem && selectedFacility && accountStatusCheck && accountAnalysisStatusCheck) {
      const facilityStatusCheck = accountStatusCheck.getFacilityStatusCheckByFacilityId(selectedFacility.guid);
      let filteredAnalysisItems: Array<IdbAnalysisItem> = [];
      if (selectedItem.analysisCategory == 'energy') {
        filteredAnalysisItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && item.energyIsSource == selectedItem.energyIsSource
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      } else if (selectedItem.analysisCategory == 'water') {
        filteredAnalysisItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      }
      //order by modified date
      filteredAnalysisItems = filteredAnalysisItems.sort((a, b) => {
        return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
      });
      filteredItems = filteredAnalysisItems.map(item => {
        return {
          analysisItem: item,
          statusCheck: facilityStatusCheck ? facilityStatusCheck.getAnalysisStatusById(item.guid) : null
        }
      });
    }
    return filteredItems;
  });

  selectedFacilityItemId: Signal<string> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const facility = this.selectedFacility();
    if (selectedItem && facility) {
      const facilityItem = selectedItem.facilityAnalysisItems.find(item => item.facilityId == facility.guid);
      const itemId = facilityItem ? facilityItem.analysisItemId : null;
      return itemId;
    }
    return null;
  });

  selectedFacilityItem: Signal<IdbAnalysisItem> = computed(() => {
    const facilityItemId = this.selectedFacilityItemId();
    const allItems = this.allFacilityAnalysisItems();
    return allItems.find(item => item.guid == facilityItemId);
  });

  itemToEdit: IdbAnalysisItem;
  showCreateItem: boolean;

  constructor() { }

  async save(analysisItemId: string) {
    const selectedAnalysisItem = this.selectedAnalysisItem();
    const facility = this.selectedFacility();
    selectedAnalysisItem.isAnalysisVisited = false;
    await this.accountAnalysisDbService.updateFacilityItemSelection(selectedAnalysisItem, analysisItemId, facility.guid);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    await this.dbChangesService.setAccountAnalysisItems(account, true);
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
    const facility = this.selectedFacility();
    const selectedAnalysisItem = this.selectedAnalysisItem();
    this.analysisService.accountAnalysisItem.next(selectedAnalysisItem);
    this.analysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis');
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
    const facility = this.selectedFacility();
    const selectedAnalysisItem = this.selectedAnalysisItem();

    this.sharedDataService.modalOpen.next(false);
    this.loadingService.setLoadingMessage('Creating Facility Analysis...')
    this.loadingService.setLoadingStatus(true);
    this.showCreateItem = false;
    this.dbChangesService.selectFacility(facility);
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, facility, accountMeterGroups, accountPredictors, selectedAnalysisItem.analysisCategory);
    newIdbItem.energyIsSource = selectedAnalysisItem.energyIsSource;
    newIdbItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
    await this.dbChangesService.selectAccount(account, false);
    await this.save(newIdbItem.guid);
    this.analysisDbService.selectedAnalysisItem.next(newIdbItem);
    this.loadingService.setLoadingStatus(false);
    this.analysisService.accountAnalysisItem.next(selectedAnalysisItem);
    this.router.navigateByUrl("/data-evaluation/facility/" + facility.guid + "/analysis/run-analysis/analysis-setup");
  }
}

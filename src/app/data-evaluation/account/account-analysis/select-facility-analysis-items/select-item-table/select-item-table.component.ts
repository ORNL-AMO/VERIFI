import { Component, computed, inject, Input, OnInit, Signal } from '@angular/core';
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

@Component({
  selector: 'app-select-item-table',
  templateUrl: './select-item-table.component.html',
  styleUrls: ['./select-item-table.component.css'],
  standalone: false
})
export class SelectItemTableComponent {
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

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.accountAnalysisItems);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbservice.selectedFacility);

  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => {
    const allItems = this.allFacilityAnalysisItems();
    const selectedItem = this.selectedAnalysisItem();
    const selectedFacility = this.selectedFacility();
    if (allItems && selectedItem && selectedFacility) {
      let filteredItems: Array<IdbAnalysisItem> = [];
      if (selectedItem.analysisCategory == 'energy') {
        filteredItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && item.energyIsSource == selectedItem.energyIsSource
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      } else if (selectedItem.analysisCategory == 'water') {
        filteredItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      }
      //order by modified date
      filteredItems = filteredItems.sort((a, b) => {
        return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
      });
      return filteredItems;
    }
  });

  selectedFacilityItemId: Signal<string> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const facility = this.selectedFacility();
    if (selectedItem && facility) {
      const facilityItem = selectedItem.facilityAnalysisItems.find(item => item.facilityId == facility.guid);
      const itemId =  facilityItem ? facilityItem.analysisItemId : null;
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
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
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
    this.analysisService.accountAnalysisItem = selectedAnalysisItem;
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
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, facility, accountMeterGroups, accountPredictors, selectedAnalysisItem.analysisCategory);
    newIdbItem.energyIsSource = selectedAnalysisItem.energyIsSource;
    newIdbItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
    await this.dbChangesService.selectAccount(account, false);
    await this.save(newIdbItem.guid);
    this.analysisDbService.selectedAnalysisItem.next(newIdbItem);
    this.loadingService.setLoadingStatus(false);
    this.analysisService.accountAnalysisItem = selectedAnalysisItem;
    this.router.navigateByUrl("/data-evaluation/facility/" + facility.guid + "/analysis/run-analysis/analysis-setup");
  }
}

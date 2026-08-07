import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
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
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = this.accountWorkspaceStore.selectedAccountAnalysis;
  allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.facilityAnalyses()]);
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
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const updatedItem: IdbAccountAnalysisItem = {
      ...selectedAnalysisItem,
      isAnalysisVisited: false,
      facilityAnalysisItems: selectedAnalysisItem.facilityAnalysisItems.map(item =>
        item.facilityId === facility.guid ? { ...item, analysisItemId } : { ...item }
      )
    };
    await this.commandBoundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: updatedItem.guid, label: 'Update Analysis Selection' },
      () => this.analysisHandler.updateAccountAnalysis(updatedItem, activeAccountGuid)
    );
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
    this.accountWorkspaceService.selectFacilityAnalysis((this.itemToEdit)?.guid);
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
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, facility, accountMeterGroups, accountPredictors, selectedAnalysisItem.analysisCategory);
    newIdbItem.energyIsSource = selectedAnalysisItem.energyIsSource;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const { value } = await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'bulk', label: 'Create Facility Analysis' },
      async () => {
        const added = await this.analysisHandler.addFacilityAnalysis(newIdbItem, activeAccountGuid);
        const updatedAccountAnalysisItem: IdbAccountAnalysisItem = {
          ...selectedAnalysisItem,
          isAnalysisVisited: false,
          facilityAnalysisItems: selectedAnalysisItem.facilityAnalysisItems.map(item =>
            item.facilityId === facility.guid ? { ...item, analysisItemId: added.guid } : { ...item }
          )
        };
        await this.analysisHandler.updateAccountAnalysis(updatedAccountAnalysisItem, activeAccountGuid);
        return { addedItem: added, updatedAccountAnalysisItem };
      }
    );
    this.accountWorkspaceService.selectFacilityAnalysis(value.addedItem?.guid);
    this.loadingService.setLoadingStatus(false);
    this.analysisService.accountAnalysisItem.next(value.updatedAccountAnalysisItem);
    this.router.navigateByUrl("/data-evaluation/facility/" + facility.guid + "/analysis/run-analysis/analysis-setup");
  }
}

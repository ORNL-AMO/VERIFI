import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisService } from '../analysis.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-analysis-list',
  templateUrl: './account-analysis-list.component.html',
  styleUrls: ['./account-analysis-list.component.css'],
  standalone: false
})
export class AccountAnalysisListComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private analysisService: AnalysisService = inject(AnalysisService);

  private allAccountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.accountAnalyses()]);

  selectedAccountAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.analysisService.accountAnalysisItem);
  selectedAnalysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => {
    const allItems = this.allAccountAnalysisItems();
    const selectedAnalysisItem = this.selectedAnalysisItem();
    if (!allItems || !selectedAnalysisItem) {
      return [];
    }
    return allItems.filter(item => item.facilityAnalysisItems.find(facilityItem => facilityItem.analysisItemId === selectedAnalysisItem.guid));
  });

  currentPageNumber: number = 1;
  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  canReturnToAccount: Signal<boolean> = computed(() => {
    const analysisItem = this.selectedAccountAnalysisItem();
    return analysisItem !== undefined;
  })

  setOrderDataField(str: string) {
    this.orderDataField = str;
  }

  selectAnalysisItem(item: IdbAccountAnalysisItem) {
    this.accountWorkspaceService.selectAccountAnalysis((item)?.guid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items')
  }

  goBackToAccount() {
    const accountAnalysisItem: IdbAccountAnalysisItem = this.selectedAccountAnalysisItem();
    this.selectAnalysisItem(accountAnalysisItem);
  }

  goToAccountAnalysisDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis')
  }
}

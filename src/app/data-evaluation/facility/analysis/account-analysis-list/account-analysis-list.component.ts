import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisService } from '../analysis.service';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-account-analysis-list',
    templateUrl: './account-analysis-list.component.html',
    styleUrls: ['./account-analysis-list.component.css'],
    standalone: false
})
export class AccountAnalysisListComponent implements OnInit {

  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  canReturnToAccount: boolean;
  constructor(private analysisDbService: AnalysisDbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router, private analysisService: AnalysisService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.canReturnToAccount = this.analysisService.accountAnalysisItem != undefined;
    let selectedAnalysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(selectedAnalysisItem.guid);

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }

  setOrderDataField(str: string) {
    this.orderDataField = str;
  }

  selectAnalysisItem(item: IdbAccountAnalysisItem) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items')
  }

  goBackToAccount() {
    this.selectAnalysisItem(this.analysisService.accountAnalysisItem);
  }

  goToAccountAnalysisDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis')
  }
}

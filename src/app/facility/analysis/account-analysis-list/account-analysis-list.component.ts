import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisService } from 'src/app/account/account-analysis/account-analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisService } from '../analysis.service';

@Component({
  selector: 'app-account-analysis-list',
  templateUrl: './account-analysis-list.component.html',
  styleUrls: ['./account-analysis-list.component.css']
})
export class AccountAnalysisListComponent implements OnInit {

  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  canReturnToAccount: boolean;
  constructor(private analysisDbService: AnalysisDbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router, private accountAnalysisService: AccountAnalysisService,
    private facilityDbService: FacilitydbService, private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.canReturnToAccount = this.analysisService.accountAnalysisItem != undefined;
    console.log(this.canReturnToAccount);


    let selectedAnalysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let allAccountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = new Array();
    allAccountAnalysisItems.forEach(accountItem => {
      accountItem.facilityAnalysisItems.forEach(facilityItem => {
        if (facilityItem.analysisItemId == selectedAnalysisItem.guid) {
          this.accountAnalysisItems.push(accountItem);
        }
      });
    });
  }

  setOrderDataField(str: string) {
    this.orderDataField = str;
  }

  selectAnalysisItem(item: IdbAccountAnalysisItem) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.accountAnalysisService.selectedFacility.next(selectedFacility);
    this.accountAnalysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('/account/analysis/select-items')
  }

  goBackToAccount() {
    this.selectAnalysisItem(this.analysisService.accountAnalysisItem);
  }
}

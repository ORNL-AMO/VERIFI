import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem} from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountAnalysisService } from '../../account-analysis.service';

@Component({
  selector: 'app-monthly-account-analysis',
  templateUrl: './monthly-account-analysis.component.html',
  styleUrls: ['./monthly-account-analysis.component.css']
})
export class MonthlyAccountAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  monthlyAccountAnalysisData: Array<MonthlyAnalysisSummaryData>;
  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calculating: boolean;

  calculatingSub: Subscription;
  monthlyAccountAnalysisDataSub: Subscription;
  constructor(private analysisService: AnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();

    this.calculatingSub = this.accountAnalysisService.calculating.subscribe(val => {
      this.calculating = val;
    });

    this.monthlyAccountAnalysisDataSub = this.accountAnalysisService.monthlyAccountAnalysisData.subscribe(val => {
      this.monthlyAccountAnalysisData = val;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy(){
    this.calculatingSub.unsubscribe();
    this.monthlyAccountAnalysisDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }
  
  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

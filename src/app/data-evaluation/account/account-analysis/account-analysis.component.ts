import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountAnalysisService } from './account-analysis.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AnalysisService } from '../../facility/analysis/analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
    selector: 'app-account-analysis',
    templateUrl: './account-analysis.component.html',
    styleUrls: ['./account-analysis.component.css'],
    standalone: false
})
export class AccountAnalysisComponent implements OnInit {

  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  monthlyKey: string;
  annualKey: string;
  account: IdbAccount;
  accountSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountAnalysisService: AccountAnalysisService,
    private analysisService: AnalysisService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.annualKey = 'annual-' + this.account?.id;
      this.monthlyKey = 'monthly-' + this.account?.id;
    });
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.accountSub.unsubscribe();
    this.accountAnalysisService.hideInUseMessage = false; 
    this.analysisService.getDisplaySubject(this.annualKey, 'table').next('table');
    this.analysisService.getDisplaySubject(this.monthlyKey, 'graph').next('graph');
  }

}

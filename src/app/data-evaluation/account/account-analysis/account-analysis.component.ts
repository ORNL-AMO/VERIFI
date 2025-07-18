import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountAnalysisService } from './account-analysis.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-account-analysis',
    templateUrl: './account-analysis.component.html',
    styleUrls: ['./account-analysis.component.css'],
    standalone: false
})
export class AccountAnalysisComponent implements OnInit {

  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.accountAnalysisService.hideInUseMessage = false;
  }

}

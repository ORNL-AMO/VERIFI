import { Component, Input, OnInit } from '@angular/core';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/form-data/naics-data';
import { IdbAccount } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-report-info',
  templateUrl: './account-report-info.component.html',
  styleUrls: ['./account-report-info.component.css']
})
export class AccountReportInfoComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  reportOptions: ReportOptions;

  naics: string;
  constructor() { }

  ngOnInit(): void {
    this.setNAICS();
  }


  setNAICS() {
    let matchingNAICS: NAICS;
    if (this.account.naics3) {
      matchingNAICS = ThirdNaicsList.find(item => { return item.code == this.account.naics3 });
    } else if (this.account.naics2) {
      matchingNAICS = SecondNaicsList.find(item => { return item.code == this.account.naics2 });
    } else if (this.account.naics1) {
      matchingNAICS = FirstNaicsList.find(item => { return item.code == this.account.naics1 });
    }

    if (matchingNAICS) {
      this.naics = matchingNAICS.code + ' - ' + matchingNAICS.industryType;
    }
  }
}

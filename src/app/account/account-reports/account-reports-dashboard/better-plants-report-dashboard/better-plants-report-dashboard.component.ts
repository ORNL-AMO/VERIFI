import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-better-plants-report-dashboard',
  templateUrl: './better-plants-report-dashboard.component.html',
  styleUrls: ['./better-plants-report-dashboard.component.css']
})
export class BetterPlantsReportDashboardComponent {

  reportItemsList: Array<{
    year: number,
    reports: Array<IdbAccountReport>
  }> = [];
  selectedAccount: IdbAccount;
  accountReportsSub: Subscription;
  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountReportsSub = this.accountReportDbService.accountReports.subscribe(items => {
      this.setListItems(items);
    });
  }

  ngOnDestroy() {
    this.accountReportsSub.unsubscribe();
  }

  setListItems(accountReports: Array<IdbAccountReport>) {
    this.reportItemsList = new Array();
    let bpReports: Array<IdbAccountReport> = accountReports.filter(report => {
      return report.reportType == 'betterPlants';
    })
    let years: Array<number> = bpReports.map(item => {
      return item.reportYear
    });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearReports: Array<IdbAccountReport> = bpReports.filter(item => {
        return item.reportYear == year;
      });
      this.reportItemsList.push({
        year: year,
        reports: yearReports,
      });
    });
  }
}

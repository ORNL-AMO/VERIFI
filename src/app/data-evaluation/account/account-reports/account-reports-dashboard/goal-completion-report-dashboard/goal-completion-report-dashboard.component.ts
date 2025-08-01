import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import _ from 'lodash';

@Component({
  selector: 'app-goal-completion-report-dashboard',
  standalone: false,

  templateUrl: './goal-completion-report-dashboard.component.html',
  styleUrl: './goal-completion-report-dashboard.component.css'
})
export class GoalCompletionReportDashboardComponent {
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
    let reports: Array<IdbAccountReport> = accountReports.filter(report => {
      return report.reportType == 'goalCompletion';
    })
    let years: Array<number> = reports.map(item => {
      return item.reportYear
    });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearReports: Array<IdbAccountReport> = reports.filter(item => {
        return item.reportYear == year;
      });
      this.reportItemsList.push({
        year: year,
        reports: yearReports,
      });
    });
  }
}


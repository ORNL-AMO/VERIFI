import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';

@Component({
  selector: 'app-account-reports-item-card',
  templateUrl: './account-reports-item-card.component.html',
  styleUrls: ['./account-reports-item-card.component.css']
})
export class AccountReportsItemCardComponent {
  @Input()
  report: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService,
    private router: Router) {

  }

  ngOnInit() {

  }

  selectReport() {
    this.accountReportDbService.selectedReport.next(this.report);
    this.router.navigateByUrl('account/account-reports/setup');
  }

  createCopy() {

  }

  deleteReport() {

  }
}

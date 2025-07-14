import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-report-setup-help',
    templateUrl: './report-setup-help.component.html',
    styleUrls: ['./report-setup-help.component.css'],
    standalone: false
})
export class ReportSetupHelpComponent {


  selectedReport: IdbAccountReport;
  selectedReportSub: Subscription;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
    });
  }

  ngOnDestroy(){
    this.selectedReportSub.unsubscribe();
  }
}

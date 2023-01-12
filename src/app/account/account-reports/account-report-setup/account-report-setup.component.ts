import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-account-report-setup',
  templateUrl: './account-report-setup.component.html',
  styleUrls: ['./account-report-setup.component.css']
})
export class AccountReportSetupComponent {

  setupForm: FormGroup;
  selectedReportSub: Subscription;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService) {

  }

  ngOnInit() {
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.setupForm = this.accountReportsService.getSetupFormFromReport(val);
    });
  }

  ngOnDestroy(){
    this.selectedReportSub.unsubscribe();
  }
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountEmissionFactorsReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../account-reports.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-account-emission-factors-report',
  standalone: false,

  templateUrl: './account-emission-factors-report.component.html',
  styleUrl: './account-emission-factors-report.component.css'
})
export class AccountEmissionFactorsReportComponent {
  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  accountEmissionFactorsReportSetup: AccountEmissionFactorsReportSetup;
  accountFacilities: Array<IdbFacility> = [];

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.accountEmissionFactorsReportSetup = this.selectedReport.accountEmissionFactorsReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.facilityDbService.getAllAccountFacilities(this.account.guid).then(facilities => {
      this.accountFacilities = facilities;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }
}
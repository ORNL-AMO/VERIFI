import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-better-climate-setup',
  templateUrl: './better-climate-setup.component.html',
  styleUrls: ['./better-climate-setup.component.css']
})
export class BetterClimateSetupComponent {

  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  reportSetup: BetterClimateReportSetup;
  constructor(private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) {
  }


  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.reportSetup = val.betterClimateReportSetup;
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.betterClimateReportSetup = this.reportSetup;
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }
}

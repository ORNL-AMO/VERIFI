import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

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
  selectedReport: IdbAccountReport;
  reportYears: Array<number>;
  constructor(private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService) {
  }


  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (!this.isFormChange) {
        this.reportSetup = val.betterClimateReportSetup;
      } else {
        this.isFormChange = false;
      }
    });
    this.setYearOptions();
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

  async addNote() {
    this.reportSetup.initiativeNotes.push({
      year: this.selectedReport.reportYear,
      note: ''
    });
    await this.save();
  }

  async deleteNote(index: number){
    this.reportSetup.initiativeNotes.splice(index, 1);
    this.save();
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsAccount('all');
    this.reportYears = yearOptions;
  }
}

import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbAccountReport, IdbUtilityMeter } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../account-reports.service';

@Component({
  selector: 'app-data-overview-setup',
  templateUrl: './data-overview-setup.component.html',
  styleUrls: ['./data-overview-setup.component.css']
})
export class DataOverviewSetupComponent {

  // overviewForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  reportSetup: DataOverviewReportSetup;
  showWater: boolean;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService) {
  }


  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.reportSetup = val.dataOverviewReportSetup;
      } else {
        this.isFormChange = false;
      }
    });
    this.setShowWater();
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    // selectedReport.dataOverviewReportSetup = this.accountReportsService.updateDataOverviewReportFromForm(selectedReport.dataOverviewReportSetup, this.overviewForm);
    selectedReport.dataOverviewReportSetup = this.reportSetup;
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
    this.showWater = waterMeter != undefined;
    if (!this.showWater && this.reportSetup.includeWaterSection) {
      this.reportSetup.includeWaterSection = false;
      this.save();
    }
  }

}

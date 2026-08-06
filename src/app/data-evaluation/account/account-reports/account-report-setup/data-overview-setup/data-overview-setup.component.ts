import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
    selector: 'app-data-overview-setup',
    templateUrl: './data-overview-setup.component.html',
    styleUrls: ['./data-overview-setup.component.css'],
    standalone: false
})
export class DataOverviewSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  // overviewForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  reportSetup: DataOverviewReportSetup;
  showWater: boolean;
  constructor(
    private accountReportDbService: AccountReportDbService,
    private injector: Injector
  ) {
  }


  ngOnInit() {
    this.account = this.accountWorkspaceStore.account();
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedAccountReport, { injector: this.injector }).subscribe(val => {
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
    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport()
    // selectedReport.dataOverviewReportSetup = this.accountReportsService.updateDataOverviewReportFromForm(selectedReport.dataOverviewReportSetup, this.overviewForm);
    selectedReport.dataOverviewReportSetup = this.reportSetup;
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectAccountReport(({ ...selectedReport })?.guid);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    this.showWater = waterMeter != undefined;
    if (!this.showWater && this.reportSetup.includeWaterSection) {
      this.reportSetup.includeWaterSection = false;
      this.save();
    }
  }

}

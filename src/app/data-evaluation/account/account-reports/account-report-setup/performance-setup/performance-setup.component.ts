import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-performance-setup',
  templateUrl: './performance-setup.component.html',
  styleUrls: ['./performance-setup.component.css'],
  standalone: false
})
export class PerformanceSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  performanceReportForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  analysisItemIdSub: Subscription;

  constructor(
    private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private accountAnalysisDbService: AccountAnalysisDbService
  ) {
  }

  ngOnInit() {
    this.account = this.accountWorkspaceStore.account();
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedAccountReport).subscribe(val => {
      if (!this.isFormChange) {
        this.performanceReportForm = this.accountReportsService.getPerformanceFormFromReport(val.performanceReportSetup);
        this.setSelectedAnalysisItem();
        this.subscribeAnalysisItemChanges();
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.analysisItemIdSub.unsubscribe();
  }

  subscribeAnalysisItemChanges() {
    if (this.analysisItemIdSub) {
      this.analysisItemIdSub.unsubscribe();
    }

    this.analysisItemIdSub = this.performanceReportForm.controls.analysisItemId.valueChanges.subscribe(async () => {
      await this.save();
    })
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();
    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport()
    selectedReport.performanceReportSetup = this.accountReportsService.updatePerformanceReportSetupFromForm(selectedReport.performanceReportSetup, this.performanceReportForm);
    if (this.selectedAnalysisItem) {
      selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    }
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectAccountReport(({ ...selectedReport })?.guid);
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisDbService.getByGuid(this.performanceReportForm.controls.analysisItemId.value);
  }
}

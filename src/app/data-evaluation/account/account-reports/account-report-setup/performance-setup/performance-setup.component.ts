import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-performance-setup',
  templateUrl: './performance-setup.component.html',
  styleUrls: ['./performance-setup.component.css'],
  standalone: false
})
export class PerformanceSetupComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);

  performanceReportForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  analysisItemIdSub: Subscription;

  constructor(
    private accountReportsService: AccountReportsService,
    private injector: Injector
  ) {
  }

  ngOnInit() {
    this.account = this.accountWorkspaceStore.account();
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedAccountReport, { injector: this.injector }).subscribe(val => {
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
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountReport', changeKind: 'update', entityGuid: selectedReport.guid, label: 'Save Report' },
      () => this.reportHandler.updateAccountReport(selectedReport, activeAccountGuid)
    );
    this.accountWorkspaceService.selectAccountReport(({ ...selectedReport })?.guid);
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.performanceReportForm.controls.analysisItemId.value);
  }
}

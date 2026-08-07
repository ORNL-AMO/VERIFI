import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-analysis-report-setup',
  standalone: false,
  templateUrl: './analysis-report-setup.component.html',
  styleUrl: './analysis-report-setup.component.css'
})
export class AnalysisReportSetupComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
  analysisReportForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
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
        this.analysisReportForm = this.accountReportsService.getAnalysisFormFromReport(val.analysisReportSetup);
        this.setSelectedAnalysisItem();
        this.subscribeAnalysisItemChanges();
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.analysisItemIdSub.unsubscribe();
  }

  subscribeAnalysisItemChanges() {
    if (this.analysisItemIdSub) {
      this.analysisItemIdSub.unsubscribe();
    }

    this.analysisItemIdSub = this.analysisReportForm.controls.analysisItemId.valueChanges.subscribe(async () => {
      await this.save();
    })
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();

    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport();
    selectedReport.analysisReportSetup = this.accountReportsService.updateAnalysisReportFromForm(selectedReport.analysisReportSetup, this.analysisReportForm);
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
    this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.analysisReportForm.controls.analysisItemId.value);
  }

}


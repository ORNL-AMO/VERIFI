import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { AccountReportsService } from '../account-reports.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getAllYearsWithDataAccount, getLatestDataDate, getYearsWithFullDataAccount } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountReportStatusCheck } from 'src/app/calculations/status-check-calculations/accountReportStatusCheck';

@Component({
  selector: 'app-account-report-setup',
  templateUrl: './account-report-setup.component.html',
  styleUrls: ['./account-report-setup.component.css'],
  standalone: false
})
export class AccountReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
  private accountReportsService: AccountReportsService = inject(AccountReportsService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  selectedReport: Signal<IdbAccountReport> = this.accountWorkspaceStore.selectedAccountReport;
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  setupForm: WritableSignal<FormGroup> = signal(undefined);
  reportYears: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const selectedReport = this.selectedReport();
    const account = this.account();
    if (calanderizedMeters && selectedReport && account) {
      if (selectedReport.reportType == 'accountSavings' || selectedReport.reportType == 'dataOverview') {
        return getAllYearsWithDataAccount(calanderizedMeters, account);
      } else {
        return getYearsWithFullDataAccount(calanderizedMeters, account);
      }
    }
    return [];
  });

  reportDateWarning: Signal<string> = computed(() => {
    const selectedReport = this.selectedReport();
    if (selectedReport) {
      if (selectedReport.reportType == 'accountSavings' || selectedReport.reportType == 'dataOverview') {
        const calanderizedMeters = this.calanderizedMeters();
        if (calanderizedMeters && calanderizedMeters.length > 0) {
          const latestDataDate = getLatestDataDate(calanderizedMeters);
          const reportDate = new Date(selectedReport.endYear, selectedReport.endMonth, 1);
          if (reportDate > latestDataDate) {
            return `Latest data for account is from ${latestDataDate.toLocaleString('default', { month: 'long' })} ${latestDataDate.getFullYear()}.`;
          }
        }
      }
    }
    return null;
  });

  reportStatusCheck: Signal<AccountReportStatusCheck> = computed(() => {
    const selectedReport = this.selectedReport();
    const accountStatusCheck = this.accountStatusCheck();
    if (selectedReport && accountStatusCheck) {
      return accountStatusCheck.accountReportStatusChecks.find(reportCheck => reportCheck.guid === selectedReport.guid);
    }
    return null;
  })

  months: Array<Month> = Months;
  currentReportId: string;
  constructor() {
    effect(() => {
      const selectedReport = this.selectedReport();
      if (selectedReport && this.currentReportId !== selectedReport.guid) {
        this.currentReportId = selectedReport.guid;
        const form = this.accountReportsService.getSetupFormFromReport(selectedReport);
        this.setupForm.set(form);
      }
    });
  }

  async save() {
    let selectedReport = this.selectedReport();
    selectedReport = this.accountReportsService.updateReportFromSetupForm(selectedReport, this.setupForm());
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountReport', changeKind: 'update', entityGuid: selectedReport.guid, label: 'Save Report' },
      () => this.reportHandler.updateAccountReport(selectedReport, activeAccountGuid)
    );
    this.accountWorkspaceService.selectAccountReport(selectedReport?.guid);
  }
}

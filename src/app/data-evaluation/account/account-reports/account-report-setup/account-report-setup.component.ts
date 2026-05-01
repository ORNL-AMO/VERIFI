import { Component, computed, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { firstValueFrom } from 'rxjs';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getAllYearsWithDataAccount, getLatestDataDate, getYearsWithFullDataAccount } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-account-report-setup',
  templateUrl: './account-report-setup.component.html',
  styleUrls: ['./account-report-setup.component.css'],
  standalone: false
})
export class AccountReportSetupComponent {
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private accountReportsService: AccountReportsService = inject(AccountReportsService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);

  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  selectedReport: Signal<IdbAccountReport> = toSignal(this.accountReportDbService.selectedReport);

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
    const updatedReport = await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account());
    this.accountReportDbService.selectedReport.next(updatedReport);
  }
}

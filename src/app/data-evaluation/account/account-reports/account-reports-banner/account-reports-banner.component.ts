import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { filter, map, startWith } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountReportErrors } from 'src/app/models/validation';
import { AccountReportValidationService } from 'src/app/shared/validation/services/account-report-validation.service';
import { emptyAccountReportErrors } from 'src/app/shared/validation/accountReportValidation';

@Component({
  selector: 'app-account-reports-banner',
  templateUrl: './account-reports-banner.component.html',
  styleUrls: ['./account-reports-banner.component.css'],
  standalone: false
})
export class AccountReportsBannerComponent {
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private accountReportValidationService: AccountReportValidationService = inject(AccountReportValidationService);

  readonly selectedReport: Signal<IdbAccountReport> = toSignal(this.accountReportDbService.selectedReport, { initialValue: null });
  readonly reportList: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports, { initialValue: [] });
  readonly accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = toSignal(this.accountAnalysisDbService.accountAnalysisItems, { initialValue: [] });
  readonly accountReportErrors: Signal<Array<AccountReportErrors>> = toSignal(this.accountReportValidationService.accountReportErrors, { initialValue: [] });

  readonly analysisVisited: Signal<boolean> = computed(() => {
    const selectedReport = this.selectedReport();
    const accountAnalysisItems = this.accountAnalysisItems();
    if (selectedReport) {
      let analysisItemId: string | undefined;
      if (selectedReport.reportType == 'betterPlants') {
        analysisItemId = selectedReport.betterPlantsReportSetup?.analysisItemId;
      }
      else if (selectedReport.reportType == 'performance') {
        analysisItemId = selectedReport.performanceReportSetup?.analysisItemId;
      }
      else if (selectedReport.reportType == 'accountSavings') {
        analysisItemId = selectedReport.accountSavingsReportSetup?.analysisItemId;
      }

      if (analysisItemId) {
        const analysisItem = accountAnalysisItems.find(item => item.guid == analysisItemId);
        if (analysisItem) {
          return analysisItem.isAnalysisVisited;
        }
      }
    }
    return false;
  });

  readonly modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen, { initialValue: false });
  private url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ), { initialValue: this.router.url }
  );
  readonly inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard');
  });

  readonly showDropdown: WritableSignal<boolean> = signal(false);

  readonly reportErrors: Signal<AccountReportErrors> = computed(() => {
    const selectedReport = this.selectedReport();
    const reportErrors = this.accountReportErrors();
    if (selectedReport && reportErrors) {
      const selectedReportErrors = reportErrors.find(errors => errors.reportId == selectedReport.guid);
      if (selectedReportErrors) {
        return selectedReportErrors;
      }
    }
    return emptyAccountReportErrors();
  });

  constructor() {
    effect(() => {
      this.url();
      this.showDropdown.set(false);
    });
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/reports/dashboard');
  }

  toggleShow() {
    this.showDropdown.update(v => !v);
  }

  selectItem(item: IdbAccountReport) {
    this.accountReportDbService.selectedReport.next(item);
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
    this.showDropdown.set(false);
  }

}

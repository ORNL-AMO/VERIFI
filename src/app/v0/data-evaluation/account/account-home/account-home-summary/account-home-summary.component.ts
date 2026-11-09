import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal } from '@angular/core';
import { AccountHomeService } from '@v0/data-evaluation/account/account-home/account-home.service';
import { Router } from '@angular/router';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { ExportToExcelTemplateV3Service } from '@shared/helper-services/export-to-excel-template-v3.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { EmailStatusCode, EmailVerifiBackupService } from '@app/v0/shared/email-verifi-backup/email-verifi-backup.service';
import { ToastNotificationsService } from '@app/shared/notifications/toast-notifications.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-home-summary',
  templateUrl: './account-home-summary.component.html',
  styleUrls: ['./account-home-summary.component.css'],
  standalone: false
})
export class AccountHomeSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private router: Router = inject(Router);
  private exportToExcelV3TemplateService: ExportToExcelTemplateV3Service = inject(ExportToExcelTemplateV3Service);
  private loadingService: LoadingService = inject(LoadingService);

  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  accountMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.meterData()]);

  latestEnergyAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  navigationAfterLoading: Signal<string> = toSignal(this.loadingService.navigationAfterLoading, { initialValue: undefined });

  disableButtons: Signal<boolean> = computed(() => {
    const accountMeterData = this.accountMeterData();
    return (accountMeterData.length == 0);
  });

  showEmailModal: boolean = false;
  emailStatusSubscription: Subscription;

  constructor(private toastNotificationsService: ToastNotificationsService,
    private emailVerifiBackupService: EmailVerifiBackupService
  ) {
    effect(() => {
      const loadingContext = this.navigationAfterLoading();
      if (loadingContext === 'export-facilities-to-excel') {
        this.exportToExcelV3TemplateService.triggerExportDownload();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnInit() {
    this.emailStatusSubscription = this.emailVerifiBackupService.emailStatus
      .subscribe(status => {
        this.closeEmailModal(status);
      });
  }

  ngOnDestroy() {
    if (this.emailStatusSubscription) {
      this.emailStatusSubscription.unsubscribe();
    }
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('/data-evaluation/account/' + urlStr);
    } else {
      this.router.navigateByUrl('/data-management/' + this.account().guid + '/import-data')
    }
  }

  //Export Modal
  showExportModal: boolean = false;
  includeWeatherData: boolean = false;
  openExportModal() {
    this.includeWeatherData = false;
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportData() {
    this.showExportModal = false;
    this.loadingService.setContext('export-facilities-to-excel');
    this.loadingService.setTitle('Exporting Facilities');
    this.exportToExcelV3TemplateService.setExportFacilityDataMessages();
    this.loadingService.setCurrentLoadingIndex(0);
    this.exportToExcelV3TemplateService.exportFacilityData(this.includeWeatherData);
  }

  goToDataManagement() {
    this.router.navigateByUrl('/data-management/' + this.account().guid + '/import-data');
  }

  openEmailModal() {
    this.showEmailModal = true;
  }

  closeEmailModal(status?: EmailStatusCode) {
    this.showEmailModal = false;
    if (status) {
      switch (status) {
        case 'success':
          this.toastNotificationsService.showToast('Email sent successfully!', undefined, 5000, false, "alert-success");
          break;
        case 'failed':
          this.toastNotificationsService.showToast('Email sending failed!', undefined, 5000, false, "alert-danger");
          break;
        case 'content-too-large':
          this.toastNotificationsService.showToast('Email content too large.', undefined, 5000, false, "alert-warning");
          break;
        default:
          this.toastNotificationsService.showToast('There was an error sending the email.', undefined, 5000, false, "alert-danger");
          break;
      }
    }
  }
}

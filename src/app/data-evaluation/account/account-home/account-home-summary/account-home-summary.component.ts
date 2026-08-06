import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { Router } from '@angular/router';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { toSignal } from '@angular/core/rxjs-interop';

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


  constructor() {
    effect(() => {
      const loadingContext = this.navigationAfterLoading();
      if (loadingContext === 'export-facilities-to-excel') {
        this.exportToExcelV3TemplateService.triggerExportDownload();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
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
}

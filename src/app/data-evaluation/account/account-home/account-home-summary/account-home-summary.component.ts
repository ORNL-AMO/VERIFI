import { Component, computed, inject, Signal } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountHomeService } from '../account-home.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
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
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private router: Router = inject(Router);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private exportToExcelV3TemplateService: ExportToExcelTemplateV3Service = inject(ExportToExcelTemplateV3Service);
  private loadingService: LoadingService = inject(LoadingService);

  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount, { initialValue: null });
  accountMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.accountMeterData, { initialValue: [] });

  latestEnergyAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: undefined });

  disableButtons: Signal<boolean> = computed(() => {
    const accountMeterData = this.accountMeterData();
    return (accountMeterData.length == 0);
  });
  waterAnalysisNeeded: Signal<boolean> = computed(() => {
    const latestWaterAnalysisItem = this.latestWaterAnalysisItem();
    const account = this.account();
    if (latestWaterAnalysisItem) {
      //todo: add check when new data is entered
    }
    return account && account.sustainabilityQuestions.waterReductionGoal ? true : false;
  });

  energyAnalysisNeeded: Signal<boolean> = computed(() => {
    const latestEnergyAnalysisItem = this.latestEnergyAnalysisItem();
    const account = this.account();
    if (latestEnergyAnalysisItem) {
      //TODO: add check when new data is entered
    }
    return account && account.sustainabilityQuestions.energyReductionGoal ? true : false;
  });


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

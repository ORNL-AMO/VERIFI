import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { firstValueFrom, Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-analysis-details-table',
  standalone: false,

  templateUrl: './account-analysis-details-table.component.html',
  styleUrl: './account-analysis-details-table.component.css'
})
export class AccountAnalysisDetailsTableComponent {

  accountAnalysisItemsSub: Subscription;
  baselineYearErrorEnergy: boolean;
  baselineYearErrorWater: boolean;
  energyYearOptions: Array<number>;
  waterYearOptions: Array<number>;
  yearOptions: Array<number>;
  selectedAccount: IdbAccount;
  analysisItemsList: Array<IdbAccountAnalysisItem>;
  filteredAnalysisItems: Array<IdbAccountAnalysisItem>;

  selectedAnalysisCategory: 'energy' | 'water' | 'all' = 'all';
  selectedReportYear: number | 'all' = 'all';
  displayDeleteModal: boolean = false;
  itemToDelete: IdbAccountAnalysisItem;
  errorList: Array<{ year: number, category: string }> = [];
  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'reportYear';
  orderByDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private accountAnalysisDbService: AccountAnalysisDbService,
    private calendarizationService: CalanderizationService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private accountReportDbService: AccountReportDbService,
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.analysisItemsList = items;
      this.filteredAnalysisItems = this.analysisItemsList;
      this.selectedAnalysisCategory = 'all';
      this.selectedReportYear = 'all';
      this.filterAnalysisItems();
      this.computeSelectionErrors();
    });

    this.energyYearOptions = this.calendarizationService.getYearOptionsAccount('energy');
    this.waterYearOptions = this.calendarizationService.getYearOptionsAccount('water');
    this.yearOptions = _.uniq([...this.energyYearOptions, ...this.waterYearOptions]);
    this.yearOptions = _.orderBy(this.yearOptions, (year) => { return year }, 'asc');

    if (this.energyYearOptions && this.selectedAccount.sustainabilityQuestions.energyReductionGoal) {
      this.baselineYearErrorEnergy = this.energyYearOptions[0] > this.selectedAccount.sustainabilityQuestions.energyReductionBaselineYear;
    }
    if (this.waterYearOptions && this.selectedAccount.sustainabilityQuestions.waterReductionGoal) {
      this.baselineYearErrorWater = this.waterYearOptions[0] > this.selectedAccount.sustainabilityQuestions.waterReductionBaselineYear;
    }

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  filterAnalysisItems() {
    this.filteredAnalysisItems = this.analysisItemsList
      .filter(item => {
        const categoryMatch = this.selectedAnalysisCategory === 'all' || item.analysisCategory === this.selectedAnalysisCategory;
        const yearMatch = this.selectedReportYear === 'all' || item.reportYear === this.selectedReportYear;
        return categoryMatch && yearMatch;
      });
  }

  async setUseItem(analysisItem: IdbAccountAnalysisItem) {
    let canSelectItem: boolean = this.getCanSelectItem(this.selectedAccount, analysisItem);
    if (canSelectItem) {
      let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
      let categoryItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => { return item.analysisCategory == analysisItem.analysisCategory });
      for (let i = 0; i < categoryItems.length; i++) {
        if (categoryItems[i].guid == analysisItem.guid) {
          if (categoryItems[i].selectedYearAnalysis) {
            categoryItems[i].selectedYearAnalysis = false;
          } else {
            categoryItems[i].selectedYearAnalysis = true;
          }
          await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(categoryItems[i]));
        } else if (categoryItems[i].reportYear == analysisItem.reportYear && categoryItems[i].selectedYearAnalysis) {
          categoryItems[i].selectedYearAnalysis = false;
          await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(categoryItems[i]));
        }
      }
      await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
      this.analysisItemsList = this.accountAnalysisDbService.accountAnalysisItems.getValue();
      this.filteredAnalysisItems = this.analysisItemsList;
      this.selectedAnalysisCategory = 'all';
      this.selectedReportYear = 'all';
      this.computeSelectionErrors();
    } else {
      this.toastNotificationService.showToast('Analysis Item Cannot Be Selected', "This baseline year does not match the account baseline year. This analysis cannot be included in reports or figures relating to the account energy goal.", 10000, false, 'alert-danger');
    }
  }

  getCanSelectItem(account: IdbAccount, analysisItem: IdbAccountAnalysisItem): boolean {
    if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.energyReductionBaselineYear) {
        return false
      } else {
        return true;
      }
    } else if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.waterReductionBaselineYear) {
        return false
      } else {
        return true;
      }
    }
  }

  selectAnalysisItem(analysisItem: IdbAccountAnalysisItem) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(analysisItem);
    if (analysisItem.setupErrors.hasError || analysisItem.setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
    } else {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results');
    }
  }

  computeSelectionErrors() {
    this.errorList = [];
    let yearCategoryPairs = Array.from(new Set(this.filteredAnalysisItems.map(item => item.reportYear + '-' + item.analysisCategory)));

    yearCategoryPairs.forEach(pair => {
      const [yearStr, category] = pair.split('-');
      const year = +yearStr;
      const itemsForYearCategory = this.filteredAnalysisItems.filter(item => item.reportYear === year && item.analysisCategory === category);

      if (itemsForYearCategory.every(item => !item.selectedYearAnalysis)) {
        this.errorList.push({ year: year, category: category });
      }
    });
  }

  hasSelectionError(year: number, category: string): boolean {
    return this.errorList.some(error => error.year === year && error.category === category);
  }

  deleteItem(analysisItem: IdbAccountAnalysisItem) {
    this.itemToDelete = analysisItem;
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    await firstValueFrom(this.accountAnalysisDbService.deleteWithObservable(this.itemToDelete.id));
    let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
    let updateReportOptions: boolean = false;
    for (let i = 0; i < accountReports.length; i++) {
      if (accountReports[i].betterPlantsReportSetup.analysisItemId == this.itemToDelete.guid) {
        accountReports[i].betterPlantsReportSetup.analysisItemId = undefined;
        await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[i]));
        updateReportOptions = true;
      }
    }
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
    this.analysisItemsList = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.filteredAnalysisItems = this.analysisItemsList;
    this.selectedAnalysisCategory = 'all';
    this.selectedReportYear = 'all';
    this.computeSelectionErrors();
  }
}

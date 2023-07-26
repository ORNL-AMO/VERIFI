import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisCategory } from 'src/app/models/analysis';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-account-analysis-dashboard',
  templateUrl: './account-analysis-dashboard.component.html',
  styleUrls: ['./account-analysis-dashboard.component.css']
})
export class AccountAnalysisDashboardComponent implements OnInit {

  selectedAccount: IdbAccount;
  routerSub: Subscription;
  newAnalysisCategory: AnalysisCategory = 'energy';
  displayNewAnalysis: boolean = false;
  hasWater: boolean;
  hasEnergy: boolean;
  analysisType: 'Energy' | 'Water';
  constructor(private router: Router, private accountAnalysisDbService: AccountAnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setAnalysisType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setAnalysisType(this.router.url);
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.setHasEnergyAndWater();
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getNewAccountAnalysisItem(this.newAnalysisCategory);
    let addedItem: IdbAccountAnalysisItem = await firstValueFrom(this.accountAnalysisDbService.addWithObservable(newItem));
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('account/analysis/setup');
  }

  async openCreateAnalysis() {
    let inWater: boolean = this.router.url.includes('water');
    if (inWater) {
      this.newAnalysisCategory = 'water'
    } else {
      this.newAnalysisCategory = 'energy';
    }

    if (this.newAnalysisCategory == 'energy' && !this.hasEnergy) {
      this.newAnalysisCategory = 'water';
    } else if (this.newAnalysisCategory == 'water' && !this.hasWater) {
      this.newAnalysisCategory = 'energy';
    }
    if (this.hasEnergy && this.hasWater) {
      this.displayNewAnalysis = true;
    } else {
      await this.createAnalysis();
    }
  }

  cancelCreate() {
    this.displayNewAnalysis = false;
  }

  setHasEnergyAndWater() {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let hasWater: boolean = false;
    let hasEnergy: boolean = false;
    groups.forEach(group => {
      if (group.groupType == 'Energy' && !this.hasEnergy) {
        hasEnergy = true;
      }
      if (group.groupType == 'Water' && !this.hasWater) {
        hasWater = true;
      }
    });
    this.hasWater = hasWater;
    this.hasEnergy = hasEnergy;
    //check nav
    if (this.analysisType == 'Energy' && !this.hasEnergy) {
      this.router.navigateByUrl('/account/analysis/dashboard/water');
    }
    if (this.analysisType == 'Water' && !this.hasWater) {
      this.router.navigateByUrl('/account/analysis/dashboard/energy');
    }
  }

  setAnalysisType(url: string) {
    if (url.includes('water')) {
      this.analysisType = 'Water';
    } else if (url.includes('energy')) {
      this.analysisType = 'Energy';
    }
  }
}

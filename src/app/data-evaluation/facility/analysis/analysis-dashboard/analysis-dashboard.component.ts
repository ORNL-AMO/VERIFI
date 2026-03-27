import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisCategory } from 'src/app/models/analysis';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-analysis-dashboard',
  templateUrl: './analysis-dashboard.component.html',
  styleUrls: ['./analysis-dashboard.component.css'],
  standalone: false
})
export class AnalysisDashboardComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showDetailSub: Subscription;
  newAnalysisCategory: AnalysisCategory = 'energy';
  displayNewAnalysis: boolean = false;
  hasWater: boolean;
  hasEnergy: boolean;
  analysisType: 'Water' | 'Energy';
  routerSub: Subscription;
  compareAnalysisModal: boolean = false;
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  selectedAnalysisItems: Array<IdbAnalysisItem> = [];
  showComparisonDetails: boolean = false;
  analysisItemsSub: Subscription;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizationSub: Subscription;
  constructor(private router: Router, private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private analyticsService: AnalyticsService,
    private predictorDbService: PredictorDbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setAnalysisType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setAnalysisType(this.router.url);

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setHasEnergyAndWater();
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.facilityAnalysisItems = items;
    });

    this.calanderizationSub = this.calanderizationService.calanderizedMeters.subscribe(meters => {
      this.calanderizedMeters = meters;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.calanderizationSub.unsubscribe();
  }

  async createAnalysis() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, this.selectedFacility, accountMeterGroups, accountPredictors, this.newAnalysisCategory);
    let addedItem: IdbAnalysisItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
    await this.dbChangesService.setAnalysisItems(account, false, this.selectedFacility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('New Analysis Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis');
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
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    this.hasEnergy = false;
    this.hasWater = false;
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
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/analysis-dashboard/water');
    }
    if (this.analysisType == 'Water' && !this.hasWater) {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/analysis-dashboard/energy');
    }
  }

  setAnalysisType(url: string) {
    if (url.includes('water')) {
      this.analysisType = 'Water';
    } else if (url.includes('energy')) {
      this.analysisType = 'Energy';
    }
  }

  openCompareAnalysis() {
    this.compareAnalysisModal = true;
  }

  closeComparisonModal() {
    this.compareAnalysisModal = false;
    this.selectedAnalysisItems = [];
    this.showComparisonDetails = false;
  }

  isSelected(analysisItem: IdbAnalysisItem): boolean {
    return this.selectedAnalysisItems.findIndex(item => item.id === analysisItem.id) > -1;
  }

  toggleSelectedAnalysisItem(analysisItem: IdbAnalysisItem) {
    this.showComparisonDetails = false;
    const index = this.selectedAnalysisItems.findIndex(item => item.id === analysisItem.id);
    if (index > -1) {
      this.selectedAnalysisItems.splice(index, 1);
    } else if (this.selectedAnalysisItems.length < 3) {
      this.selectedAnalysisItems.push(analysisItem);
    }
  }

  showDetails() {
    this.showComparisonDetails = true;
  }
}

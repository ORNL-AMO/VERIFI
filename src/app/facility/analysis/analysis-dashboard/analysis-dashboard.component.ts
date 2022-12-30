import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAccount, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import * as _ from 'lodash';
import { AnalysisService } from '../analysis.service';

@Component({
  selector: 'app-analysis-dashboard',
  templateUrl: './analysis-dashboard.component.html',
  styleUrls: ['./analysis-dashboard.component.css']
})
export class AnalysisDashboardComponent implements OnInit {

  facilityAnalysisItems: Array<IdbAnalysisItem>;
  facilityAnalysisItemsSub: Subscription;

  baselineYearErrorMin: boolean;
  baselineYearErrorMax: boolean;
  yearOptions: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  analysisItemsList: Array<{
    year: number,
    analysisItems: Array<IdbAnalysisItem>,
    hasSelectedItem: boolean
  }>;
  showDetail: boolean;
  showDetailSub: Subscription;
  constructor(private router: Router, private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.setAnalysisItemsList(items);
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.yearOptions = this.utilityMeterDataDbService.getYearOptions();
      if (this.yearOptions) {
        this.baselineYearErrorMin = this.yearOptions[0] > this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
        this.baselineYearErrorMax = this.yearOptions[this.yearOptions.length - 1] < this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear
      }
    });

    this.showDetailSub = this.analysisService.showDetail.subscribe(showDetail => {
      this.showDetail = showDetail;
    })
  }

  ngOnDestroy() {
    this.facilityAnalysisItemsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.showDetailSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAnalysisItem = this.analysisDbService.getNewAnalysisItem();
    let addedItem: IdbAnalysisItem = await this.analysisDbService.addWithObservable(newItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('New Analysis Created', undefined, undefined, false, "bg-success");
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  selectAnalysisItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    //todo: route to results if item setup
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  setAnalysisItemsList(facilityAnalysisItems: Array<IdbAnalysisItem>) {
    this.analysisItemsList = new Array();
    let years: Array<number> = facilityAnalysisItems.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.reportYear == year });
      this.analysisItemsList.push({
        year: year,
        analysisItems: yearAnalysisItems,
        hasSelectedItem: yearAnalysisItems.findIndex((item: IdbAnalysisItem) => { return item.selectedYearAnalysis == true }) != -1
      });
    })
  }

  saveShowDetails() {
    this.analysisService.showDetail.next(this.showDetail);
  }
}

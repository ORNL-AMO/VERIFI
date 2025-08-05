import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilityOverviewService } from '../facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
    selector: 'app-facility-overview-banner',
    templateUrl: './facility-overview-banner.component.html',
    styleUrls: ['./facility-overview-banner.component.css'],
    standalone: false
})
export class FacilityOverviewBannerComponent implements OnInit {

  modalOpenSub: Subscription;
  modalOpen: boolean;
  routerSub: Subscription;
  urlDisplay: 'energy' | 'emissions' | 'other';
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showWater: boolean;

  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  months: Array<Month> = Months;
  years: Array<number>;
  dateRangeSub: Subscription;
  showReportModal: boolean = false;
  errorMessage: string;
  facilityReport: IdbFacilityReport;
  constructor(private sharedDataService: SharedDataService, private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityOverviewService: FacilityOverviewService,
    private dbChangesService: DbChangesService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupIdbService: UtilityMeterGroupdbService,
    private facilityReportDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setShowWater();
      this.setYears();
    });

    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setUrlString(this.router.url);
      }
    });
    this.setUrlString(this.router.url);

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.minMonth = dateRange.startDate.getMonth();
        this.minYear = dateRange.startDate.getFullYear();
        this.maxMonth = dateRange.endDate.getMonth();
        this.maxYear = dateRange.endDate.getFullYear();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.routerSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  setUrlString(url: string) {
    if (url.includes('energy')) {
      this.urlDisplay = 'energy';
    } else if (url.includes('emissions')) {
      this.urlDisplay = 'emissions';
    } else {
      this.urlDisplay = 'other';
    }
  }


  async setEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
    }
  }


  setEmissions(display: 'market' | 'location') {
    this.facilityOverviewService.emissionsDisplay.next(display);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    this.showWater = waterMeter != undefined;
  }

  openCreateReportModal() {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupIdbService.getFacilityGroups(this.selectedFacility.guid);
    this.facilityReport = getNewIdbFacilityReport(this.selectedFacility.guid, this.selectedFacility.accountId, 'overview', groups);
    this.facilityReport.name = 'New Data Overview Report';
    this.facilityReport.dataOverviewReportSettings.startMonth = this.minMonth;
    this.facilityReport.dataOverviewReportSettings.startYear = this.minYear;
    this.facilityReport.dataOverviewReportSettings.endMonth = this.maxMonth;
    this.facilityReport.dataOverviewReportSettings.endYear = this.maxYear;
    this.facilityReport.dataOverviewReportSettings.energyIsSource = this.selectedFacility.energyIsSource;
    this.facilityReport.dataOverviewReportSettings.emissionsDisplay = this.emissionsDisplay;

    if (!this.showWater) {
      this.facilityReport.dataOverviewReportSettings.includeWaterSection = false;
    }
    this.showReportModal = true;
  }

  cancelCreateReport() {
    this.showReportModal = false;
  }

  async createReport() {
    this.facilityReport = await firstValueFrom(this.facilityReportDbService.addWithObservable(this.facilityReport));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(account, this.selectedFacility);
    this.facilityReportDbService.selectedReport.next(this.facilityReport);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/reports/setup');
  }

  // date validation
  setDate() {
    let startDate: Date = new Date(this.minYear, this.minMonth, 1);
    let endDate: Date = new Date(this.maxYear, this.maxMonth, 1);

    //compare start date and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date';
      return;
    }

    this.errorMessage = '';
    this.facilityOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  setYears() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let allYears: Array<number> = facilityMeterData.flatMap(meterData => { return new Date(meterData.readDate).getFullYear() });
    allYears = _.uniq(allYears);
    allYears = _.orderBy(allYears, (year) => {
      return year;
    }, 'asc');
    this.years = allYears;
  }
}

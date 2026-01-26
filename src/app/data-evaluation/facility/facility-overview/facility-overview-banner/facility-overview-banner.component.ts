import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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

  @ViewChild('navTabs') navTabs: ElementRef;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showWater: boolean;

  showReportModal: boolean = false;
  facilityReport: IdbFacilityReport;

  hideTabText: boolean = false;
  hideAllText: boolean = false;
  constructor(private sharedDataService: SharedDataService, private facilityDbService: FacilitydbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterGroupIdbService: UtilityMeterGroupdbService,
    private facilityReportDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private cd: ChangeDetectorRef,
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setShowWater();
    });
  }

  ngAfterViewInit() {
    this.setHideTabText();
    this.cd.detectChanges();
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
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
    let dateRange: { startDate: Date, endDate: Date } = this.facilityOverviewService.dateRange.getValue();
    this.facilityReport.dataOverviewReportSettings.startMonth = dateRange.startDate.getMonth();
    this.facilityReport.dataOverviewReportSettings.startYear = dateRange.startDate.getFullYear();
    this.facilityReport.dataOverviewReportSettings.endMonth = dateRange.endDate.getMonth();
    this.facilityReport.dataOverviewReportSettings.endYear = dateRange.endDate.getFullYear();
    this.facilityReport.dataOverviewReportSettings.energyIsSource = this.selectedFacility.energyIsSource;
    this.facilityReport.dataOverviewReportSettings.emissionsDisplay = this.facilityOverviewService.emissionsDisplay.getValue();

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

  setHideTabText() {
    this.hideTabText = this.navTabs.nativeElement.offsetWidth < 400;
    this.hideAllText = this.navTabs.nativeElement.offsetWidth < 300;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setHideTabText();
  }


}

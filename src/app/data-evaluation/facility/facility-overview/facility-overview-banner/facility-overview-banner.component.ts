import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { FacilityOverviewService } from '../facility-overview.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-facility-overview-banner',
  templateUrl: './facility-overview-banner.component.html',
  styleUrls: ['./facility-overview-banner.component.css'],
  standalone: false
})
export class FacilityOverviewBannerComponent implements OnInit {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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

  account: IdbAccount;
  accountSub: Subscription
  constructor(
    private sharedDataService: SharedDataService,
    private router: Router,
    private facilityReportDbService: FacilityReportsDbService,
    private cd: ChangeDetectorRef,
    private facilityOverviewService: FacilityOverviewService
  ) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(val => {
      this.selectedFacility = val;
      this.setShowWater();
    });
    this.accountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.account = account;
    });
  }

  ngAfterViewInit() {
    this.setHideTabText();
    this.cd.detectChanges();
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    this.showWater = waterMeter != undefined;
  }

  openCreateReportModal() {
    let groups: Array<IdbUtilityMeterGroup> = this.accountWorkspaceQuery.getFacilityMeterGroups(this.selectedFacility.guid);
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
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectFacilityReport((this.facilityReport)?.guid);
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

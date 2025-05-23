import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { MeterGroupingService } from './meter-grouping.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getFirstBillEntryFromCalanderizedMeterData, getLastBillEntryFromCalanderizedMeterData } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-meter-grouping',
    templateUrl: './meter-grouping.component.html',
    styleUrls: ['./meter-grouping.component.css'],
    standalone: false
})
export class MeterGroupingComponent implements OnInit {

  meterGroupTypes: Array<MeterGroupType>;

  months: Array<Month> = Months;
  groupToEdit: IdbUtilityMeterGroup;
  groupToDelete: IdbUtilityMeterGroup;
  selectedFacilitySub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  editOrAdd: 'edit' | 'add';
  waterUnit: string;
  energyUnit: string;
  lastBillDate: Date;
  yearPriorToLastBill: Date;
  dataDisplay: "grouping" | "table" | "graph";
  displayGraphEnergy: "bar" | "scatter";
  displayGraphCost: "bar" | "scatter";
  itemsPerPage: number;
  itemsPerPageSub: Subscription
  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  years: Array<number>;
  dateRangeSub: Subscription;
  dateRange: { maxDate: Date, minDate: Date };
  selectedFacility: IdbFacility;
  facilityMeterGroups: Array<IdbUtilityMeterGroup>;
  calanderizedMeters: Array<CalanderizedMeter>;
  showEditMeterModal: boolean = false;
  meterToEdit: IdbUtilityMeter;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private loadingService: LoadingService, private toastNoticationService: ToastNotificationsService,
    private meterGroupingService: MeterGroupingService, private analysisDbService: AnalysisDbService, private sharedDataService: SharedDataService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.meterGroupingService.dataDisplay;
    this.displayGraphEnergy = this.meterGroupingService.displayGraphEnergy;
    this.displayGraphCost = this.meterGroupingService.displayGraphCost;
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.facilityMeterGroups = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
      this.setCalanderizedMeters();
      this.setGroupTypes();
      if (selectedFacility) {
        this.waterUnit = selectedFacility.volumeLiquidUnit;
        this.energyUnit = selectedFacility.energyUnit;
      }
    });

    this.dateRangeSub = this.meterGroupingService.dateRange.subscribe(val => {
      this.dateRange = val;
      if (val.maxDate) {
        let maxDate: Date = new Date(val.maxDate);
        this.maxYear = maxDate.getFullYear();
        this.maxMonth = maxDate.getMonth();
        let minDate: Date = new Date(val.minDate);
        this.minMonth = minDate.getMonth();
        this.minYear = minDate.getFullYear();
        if (!this.years || this.years.length == 0) {
          this.setYears();
        }
        this.setGroupTypes();
      } else {
        this.initializeDateRange();
      }
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.meterGroupingService.dataDisplay = this.dataDisplay;
    this.meterGroupingService.displayGraphEnergy = this.displayGraphEnergy;
    this.meterGroupingService.displayGraphCost = this.displayGraphCost;
  }

  setCalanderizedMeters() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.calanderizedMeters = getCalanderizedMeterData(this.facilityMeters, facilityMeterData, this.selectedFacility, false, undefined, [], [], [this.selectedFacility], account.assessmentReportVersion);
  }

  initializeDateRange() {
    let startDateData: MonthlyData = getFirstBillEntryFromCalanderizedMeterData(this.calanderizedMeters);
    let endDateData: MonthlyData = getLastBillEntryFromCalanderizedMeterData(this.calanderizedMeters);
    let startDate: Date = new Date(startDateData.date);
    let endDate: Date = new Date(endDateData.date);
    this.setYears(startDate, endDate);
    this.meterGroupingService.dateRange.next({ minDate: new Date(startDate), maxDate: new Date(endDate) });
  }

  setYears(startDate?: Date, endDate?: Date) {
    if (!startDate || !endDate) {
      let startDateData: MonthlyData = getFirstBillEntryFromCalanderizedMeterData(this.calanderizedMeters);
      let endDateData: MonthlyData = getLastBillEntryFromCalanderizedMeterData(this.calanderizedMeters);
      startDate = new Date(startDateData.date);
      endDate = new Date(endDateData.date);
    }
    this.years = new Array();
    for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
      this.years.push(year);
    }
  }

  setGroupTypes() {
    if (this.dateRange && this.dateRange.maxDate) {
      this.meterGroupTypes = this.meterGroupingService.getMeterGroupTypes(this.calanderizedMeters);
    }
  }

  setEditGroup(group: IdbUtilityMeterGroup) {
    this.editOrAdd = 'edit';
    this.groupToEdit = group;
    this.sharedDataService.modalOpen.next(true);
  }

  setDeleteGroup(group: IdbUtilityMeterGroup) {
    let groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == group.guid });
    // Check if group has data
    if (groupMeters.length != 0) {
      alert("Group must be empty before deleting.");
    } else {
      this.groupToDelete = group;
    }
  }

  closeEditGroup(needUpdate: boolean) {
    this.editOrAdd = undefined;
    this.groupToEdit = undefined;
    this.sharedDataService.modalOpen.next(false);
    if (needUpdate) {
      this.facilityMeterGroups = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
      this.setGroupTypes();
    }
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }

  async drop(event: CdkDragDrop<IdbUtilityMeterGroup[]>) {
    let draggedMeter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == event.item.data.id });
    let group: IdbUtilityMeterGroup = this.facilityMeterGroups.find(group => { return group.id == Number(event.container.id) })
    draggedMeter.groupId = group.guid;
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(draggedMeter));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(selectedAccount, this.selectedFacility);
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.setCalanderizedMeters();
    this.setGroupTypes();
  }

  groupAdd(groupType: 'Energy' | 'Water' | 'Other') {
    this.editOrAdd = 'add';
    this.groupToEdit = getNewIdbUtilityMeterGroup(groupType, 'New Group', this.selectedFacility.guid, this.selectedFacility.accountId);
    this.sharedDataService.modalOpen.next(true);
  }

  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await firstValueFrom(this.utilityMeterGroupDbService.deleteWithObservable(this.groupToDelete.id));
    await this.dbChangesService.setMeterGroups(selectedAccount, this.selectedFacility);
    //update analysis items
    await this.analysisDbService.deleteGroup(this.groupToDelete.guid);
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    //update BCC reports
    await this.accountReportDbService.updateReportsRemoveGroup(this.groupToDelete.guid);
    await this.dbChangesService.setAccountReports(selectedAccount);
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "alert-success");

    this.setGroupTypes();
  }

  async setToggleView(meterGroup) {
    meterGroup.visible = !meterGroup.visible
    if (meterGroup.name != "Ungrouped") {
      await firstValueFrom(this.utilityMeterGroupDbService.updateWithObservable(meterGroup));
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setMeterGroups(selectedAccount, this.selectedFacility);
    }
  }

  setDataDisplay(val: "grouping" | "table" | "graph") {
    this.dataDisplay = val;
  }

  setDisplayGraphEnergy(val: "bar" | "scatter") {
    this.displayGraphEnergy = val;
  }

  setDisplayGraphCost(val: "bar" | "scatter") {
    this.displayGraphCost = val;
  }
  setMinDate() {
    let minDate: Date = new Date(this.minYear, this.minMonth);
    let dateRange: { minDate: Date, maxDate: Date } = this.meterGroupingService.dateRange.getValue();
    dateRange.minDate = minDate;
    this.meterGroupingService.dateRange.next(dateRange);
  }

  setMaxDate() {
    let maxDate: Date = new Date(this.maxYear, this.maxMonth);
    let dateRange: { minDate: Date, maxDate: Date } = this.meterGroupingService.dateRange.getValue();
    dateRange.maxDate = maxDate;
    this.meterGroupingService.dateRange.next(dateRange);
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
    }
  }

  openEditMeterModal(meter: IdbUtilityMeter) {
    this.meterToEdit = meter;
    this.showEditMeterModal = true;
    this.sharedDataService.modalOpen.next(true);
  }

  closeEditMeter() {
    this.meterToEdit = undefined;
    this.showEditMeterModal = false;
    this.sharedDataService.modalOpen.next(false);
  }

  async saveMeterEdit() {
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.meterToEdit));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(selectedAccount, this.selectedFacility);
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.setCalanderizedMeters();
    this.setGroupTypes();
    this.closeEditMeter();
  }
}
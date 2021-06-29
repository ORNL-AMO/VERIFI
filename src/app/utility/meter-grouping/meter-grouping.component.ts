import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizationService } from '../../shared/helper-services/calanderization.service';
import { CalanderizedMeter, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import { MeterGroupingService } from './meter-grouping.service';
import { globalVariables } from 'src/environments/environment';

@Component({
  selector: 'app-meter-grouping',
  templateUrl: './meter-grouping.component.html',
  styleUrls: ['./meter-grouping.component.css']
})
export class MeterGroupingComponent implements OnInit {

  meterGroupTypes: Array<MeterGroupType>;

  globalVariables = globalVariables;
  groupToEdit: IdbUtilityMeterGroup;
  groupToDelete: IdbUtilityMeterGroup;
  facilityMeterDataSub: Subscription;
  facilityMeterGroupsSub: Subscription;
  selectedFacilitySub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  editOrAdd: string;
  facilityMetersSub: Subscription;
  waterUnit: string;
  energyUnit: string;
  lastBillDate: Date;
  yearPriorToLastBill: Date;
  dataDisplay: "grouping" | "table" | "graph";
  displayGraphEnergy: "bar" | "scatter";
  displayGraphCost: "bar" | "scatter";
  itemsPerPage: number = 6;
  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  years: Array<number>;
  dateRangeSub: Subscription;
  dateRange: { maxDate: Date, minDate: Date };
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService, private calanderizationService: CalanderizationService,
    private loadingService: LoadingService, private toastNoticationService: ToastNotificationsService,
    private meterGroupingService: MeterGroupingService) { }

  ngOnInit(): void {
    this.dataDisplay = this.meterGroupingService.dataDisplay;
    this.displayGraphEnergy = this.meterGroupingService.displayGraphEnergy;
    this.displayGraphCost = this.meterGroupingService.displayGraphCost;
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        this.waterUnit = selectedFacility.volumeLiquidUnit;
        this.energyUnit = selectedFacility.energyUnit;
      }
    });

    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(() => {
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    });

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(val => {
      this.facilityMeters = val;
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    });

    this.dateRangeSub = this.meterGroupingService.dateRange.subscribe(val => {
      this.dateRange = val;
      if (val.maxDate) {
        this.setGroupTypes();
        let maxDate: Date = new Date(val.maxDate);
        this.maxYear = maxDate.getFullYear();
        this.maxMonth = maxDate.getMonth();
        let minDate: Date = new Date(val.minDate);
        this.minMonth = minDate.getMonth();
        this.minYear = minDate.getFullYear();
      } else {
        this.initializeDateRange();
      }
    });
  }

  ngOnDestroy() {
    this.facilityMeterGroupsSub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    this.meterGroupingService.dataDisplay = this.dataDisplay;
    this.meterGroupingService.displayGraphEnergy = this.displayGraphEnergy;
    this.meterGroupingService.displayGraphCost = this.displayGraphCost;
  }

  initializeDateRange() {
    this.years = new Array();
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(this.facilityMeters, false);
    let startDateData: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let endDateData: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let startDate: Date = new Date(startDateData.date);
    let endDate: Date = new Date(endDateData.date);
    for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
      this.years.push(year);
    }
    this.meterGroupingService.dateRange.next({ minDate: new Date(startDateData.date), maxDate: new Date(endDateData.date) });
  }

  setGroupTypes() {
    if (this.dateRange && this.dateRange.maxDate) {
      this.meterGroupTypes = this.meterGroupingService.getMeterGroupTypes(this.facilityMeters);
    }
  }

  setEditGroup(group: IdbUtilityMeterGroup) {
    this.editOrAdd = 'edit';
    this.groupToEdit = group;
  }

  setDeleteGroup(group: IdbUtilityMeterGroup) {
    let groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == group.id });
    // Check if group has data
    if (groupMeters.length != 0) {
      alert("Group must be empty before deleting.");
    } else {
      this.groupToDelete = group;
    }
  }

  closeEditGroup() {
    this.editOrAdd = undefined;
    this.groupToEdit = undefined;
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }

  drop(event: CdkDragDrop<string[]>) {
    let draggedMeter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == event.item.data.id });
    let newGroupId: number = Number(event.container.id);
    draggedMeter.groupId = newGroupId;
    this.setGroupTypes();
    this.utilityMeterDbService.update(draggedMeter);
  }

  groupAdd(groupType: string) {
    this.editOrAdd = 'add';
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.groupToEdit = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup(groupType, 'New Group', facility.id, facility.accountId);
  }

  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    await this.utilityMeterGroupDbService.deleteWithObservable(this.groupToDelete.id);
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == selectedFacility.id });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "success");
  }

  setToggleView(meterGroup) {
    meterGroup.visible = !meterGroup.visible
    if (meterGroup.name != "Ungrouped") {
      this.utilityMeterGroupDbService.update(meterGroup);
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
}
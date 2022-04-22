import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizationService } from '../../../shared/helper-services/calanderization.service';
import { CalanderizedMeter, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { MeterGroupingService } from './meter-grouping.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-meter-grouping',
  templateUrl: './meter-grouping.component.html',
  styleUrls: ['./meter-grouping.component.css']
})
export class MeterGroupingComponent implements OnInit {

  meterGroupTypes: Array<MeterGroupType>;

  months: Array<Month> = Months;
  groupToEdit: IdbUtilityMeterGroup;
  groupToDelete: IdbUtilityMeterGroup;
  facilityMeterDataSub: Subscription;
  facilityMeterGroupsSub: Subscription;
  selectedFacilitySub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  editOrAdd: 'edit' | 'add';
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
  selectedFacility: IdbFacility;
  facilityMeterGroups: Array<IdbUtilityMeterGroup>;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService, private calanderizationService: CalanderizationService,
    private loadingService: LoadingService, private toastNoticationService: ToastNotificationsService,
    private meterGroupingService: MeterGroupingService, private analysisDbService: AnalysisDbService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.dataDisplay = this.meterGroupingService.dataDisplay;
    this.displayGraphEnergy = this.meterGroupingService.displayGraphEnergy;
    this.displayGraphCost = this.meterGroupingService.displayGraphCost;
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
      if (selectedFacility) {
        this.waterUnit = selectedFacility.volumeLiquidUnit;
        this.energyUnit = selectedFacility.energyUnit;
      }
    });

    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(groups => {
      this.facilityMeterGroups = groups;
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
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(this.facilityMeters, false);
    let startDateData: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let endDateData: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let startDate: Date = new Date(startDateData.date);
    let endDate: Date = new Date(endDateData.date);
    this.setYears(startDate, endDate);
    this.meterGroupingService.dateRange.next({ minDate: new Date(startDate), maxDate: new Date(endDate) });
  }

  setYears(startDate?: Date, endDate?: Date) {
    if (!startDate || !endDate) {
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(this.facilityMeters, false);
      let startDateData: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
      let endDateData: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
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
      this.meterGroupTypes = this.meterGroupingService.getMeterGroupTypes(this.facilityMeters);
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

  closeEditGroup() {
    this.editOrAdd = undefined;
    this.groupToEdit = undefined;
    this.sharedDataService.modalOpen.next(false);
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }

  drop(event: CdkDragDrop<string[]>) {
    let draggedMeter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == event.item.data.id });
    let group: IdbUtilityMeterGroup = this.facilityMeterGroups.find(group => {return group.id == Number(event.container.id)})
    draggedMeter.groupId = group.guid;
    this.setGroupTypes();
    this.utilityMeterDbService.update(draggedMeter);
  }

  groupAdd(groupType: string) {
    this.editOrAdd = 'add';
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.groupToEdit = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup(groupType, 'New Group', facility.guid, facility.accountId);
    this.sharedDataService.modalOpen.next(true);
  }

  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    await this.utilityMeterGroupDbService.deleteWithObservable(this.groupToDelete.id).toPromise();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == selectedFacility.guid });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);  
    await this.analysisDbService.deleteGroup(this.groupToDelete.guid);
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

  setFacilityEnergyIsSource(energyIsSource: boolean) {
    this.selectedFacility.energyIsSource = energyIsSource;
    this.facilityDbService.update(this.selectedFacility);
  }
}
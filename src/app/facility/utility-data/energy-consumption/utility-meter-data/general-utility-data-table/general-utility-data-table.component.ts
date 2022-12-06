import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { CalanderizationService, EmissionsResults } from 'src/app/shared/helper-services/calanderization.service';
import { EditMeterFormService } from '../../energy-source/edit-meter-form/edit-meter-form.service';
import { Subscription } from 'rxjs';
import { GeneralUtilityDataFilters } from 'src/app/models/meterDataFilter';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css']
})
export class GeneralUtilityDataTableComponent implements OnInit {
  @Input()
  selectedMeter: IdbUtilityMeter;
  @Input()
  selectedMeterData: Array<IdbUtilityMeterData>;
  @Input()
  itemsPerPage: number;
  @Output('setChecked')
  setChecked: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output('setEdit')
  setEdit: EventEmitter<IdbUtilityMeterData> = new EventEmitter<IdbUtilityMeterData>();
  @Output('setDelete')
  setDelete: EventEmitter<IdbUtilityMeterData> = new EventEmitter<IdbUtilityMeterData>();

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;

  allChecked: boolean;
  energyUnit: string;
  volumeUnit: string;
  showVolumeColumn: boolean;
  showEnergyColumn: boolean;
  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  copyingTable: boolean = false;
  showEmissions: boolean;
  filterSub: Subscription;
  generalUtilityDataFilters: GeneralUtilityDataFilters;
  constructor(public utilityMeterDataService: UtilityMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private copyTableService: CopyTableService,
    private calanderizationService: CalanderizationService, private editMeterFormService: EditMeterFormService) { }

  ngOnInit(): void {
    this.setData();

    if (this.selectedMeterData.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.selectedMeterData.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }

    this.filterSub = this.utilityMeterDataService.tableGeneralUtilityFilters.subscribe(val => {
      this.generalUtilityDataFilters = val;
    })
  }

  ngOnDestroy() {
    this.filterSub.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.itemsPerPage && !changes.itemsPerPage.firstChange) {
      this.allChecked = false;
      this.checkAll();
    }

    if (changes.selectedMeterData && !changes.selectedMeterData.firstChange) {
      this.setData();
    }
  }

  setData() {
    this.showVolumeColumn = (this.selectedMeterData.find(dataItem => { return dataItem.totalVolume != undefined && dataItem.totalVolume != 0}) != undefined);
    this.volumeUnit = this.selectedMeter.startingUnit;
    this.showEnergyColumn = this.energyUnitsHelperService.isEnergyMeter(this.selectedMeter.source);
    this.showEmissions = this.editMeterFormService.checkShowEmissionsOutputRate(this.selectedMeter.source);
    if (this.showEmissions) {
      this.setEmissions();
    }
    if (this.showEnergyColumn) {
      this.energyUnit = this.selectedMeter.energyUnit;
    }
  }


  checkAll() {
    if (this.allChecked) {
      this.selectedMeterData = _.orderBy(this.selectedMeterData, this.orderDataField, this.orderByDirection)
      let displayedItems = this.selectedMeterData.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
      displayedItems.forEach(item => {
        item.checked = this.allChecked;
      });
    } else {
      this.selectedMeterData.forEach(item => {
        item.checked = false;
      });
    }
    this.setChecked.emit(true);
  }

  toggleChecked() {
    this.setChecked.emit(true);
  }

  setEditMeterData(meterData): void {
    this.setEdit.emit(meterData);
  }

  setDeleteMeterData(meterData): void {
    this.setDelete.emit(meterData);
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

  checkError(readDate: Date): string {
    let readDateItem: Date = new Date(readDate);
    // if (this.meterListItem.errorDate) {
    //   if (readDateItem.getUTCFullYear() == this.meterListItem.errorDate.getUTCFullYear() && readDateItem.getUTCMonth() == this.meterListItem.errorDate.getUTCMonth() && readDateItem.getUTCDate() == this.meterListItem.errorDate.getUTCDate()) {
    //     return 'alert-danger';
    //   }
    // } else if (this.meterListItem.warningDate) {
    //   if (readDateItem.getUTCFullYear() == this.meterListItem.warningDate.getUTCFullYear() && readDateItem.getUTCMonth() == this.meterListItem.warningDate.getUTCMonth()) {
    //     return 'alert-warning';
    //   }
    // } else if (this.meterListItem.missingMonth) {
    //   let testDate1: Date = new Date(readDateItem.getUTCFullYear(), readDateItem.getUTCMonth() - 1);
    //   let testDate2: Date = new Date(readDateItem.getUTCFullYear(), readDateItem.getUTCMonth() + 1);
    //   if (testDate1.getUTCFullYear() == this.meterListItem.missingMonth.getUTCFullYear() && testDate1.getUTCMonth() == this.meterListItem.missingMonth.getUTCMonth()) {
    //     return 'alert-warning';
    //   }
    //   if (testDate2.getUTCFullYear() == this.meterListItem.missingMonth.getUTCFullYear() && testDate2.getUTCMonth() == this.meterListItem.missingMonth.getUTCMonth()) {
    //     return 'alert-warning';
    //   }
    // }
    return undefined;
  }


  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }

  setEmissions() {
    this.selectedMeterData.forEach(dataItem => {
      let emissionsValues: EmissionsResults = this.calanderizationService.getEmissions(this.selectedMeter, dataItem.totalEnergyUse, this.selectedMeter.energyUnit, new Date(dataItem.readDate).getFullYear());
      dataItem.totalMarketEmissions = emissionsValues.marketEmissions;
      dataItem.totalLocationEmissions = emissionsValues.locationEmissions;
      dataItem.RECs = emissionsValues.RECs;
      dataItem.excessRECs = emissionsValues.excessRECs;
      dataItem.excessRECsEmissions = emissionsValues.excessRECsEmissions;
    })
  }
}

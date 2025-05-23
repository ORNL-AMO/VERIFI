import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { UtilityMeterDataService } from '../../utility-meter-data.service';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { Subscription } from 'rxjs';
import { GeneralUtilityDataFilters } from 'src/app/models/meterDataFilter';
import { checkShowEmissionsOutputRate, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getEmissions, setUtilityDataEmissionsValues } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css'],
  standalone: false
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

  numDetailedCharges: number;
  numGeneralInformation: number;
  numEmissions: number;
  showEmissionsSection: boolean;
  showDetailedCharges: boolean;
  showEstimated: boolean;
  constructor(public utilityMeterDataService: UtilityMeterDataService,
    private copyTableService: CopyTableService,
    private eGridService: EGridService, private facilityDbService: FacilitydbService,
    private customFuelDbService: CustomFuelDbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.setData();

    if (this.selectedMeterData.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.selectedMeterData.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }

    this.filterSub = this.utilityMeterDataService.tableGeneralUtilityFilters.subscribe(val => {
      this.generalUtilityDataFilters = val;
      this.setNumColumns();
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

    if ((changes.selectedMeterData && !changes.selectedMeterData.firstChange) || (changes.selectedMeter && !changes.selectedMeter.firstChange)) {
      this.setData();
    }
  }

  setData() {
    this.showVolumeColumn = (this.selectedMeterData.find(dataItem => { return dataItem.totalVolume != undefined && dataItem.totalVolume != 0 }) != undefined);
    this.volumeUnit = this.selectedMeter.startingUnit;
    if (this.selectedMeter.source == 'Other') {
      this.showEnergyColumn = (getIsEnergyUnit(this.selectedMeter.startingUnit) == true);
    } else {
      this.showEnergyColumn = getIsEnergyMeter(this.selectedMeter.source);
    }
    this.showEmissions = checkShowEmissionsOutputRate(this.selectedMeter);
    this.showEstimated = (this.selectedMeterData.find(dataItem => { return dataItem.isEstimated == true })) != undefined;
    if (this.showEmissions) {
      this.setEmissions();
    }
    if (this.showEnergyColumn) {
      this.energyUnit = this.selectedMeter.energyUnit;
    }
    if (this.generalUtilityDataFilters) {
      this.setNumColumns()
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
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.selectedMeterData.forEach(dataItem => {
      let emissionsValues: EmissionsResults = getEmissions(this.selectedMeter, dataItem.totalEnergyUse, this.selectedMeter.energyUnit, new Date(dataItem.readDate).getFullYear(), false, [facility], this.eGridService.co2Emissions, customFuels, dataItem.totalVolume, undefined, undefined, dataItem.heatCapacity, account.assessmentReportVersion);
      dataItem = setUtilityDataEmissionsValues(dataItem, emissionsValues);
    });
  }

  setNumColumns() {
    this.numDetailedCharges = 0;
    this.numGeneralInformation = 2;
    this.numEmissions = 0;
    if (this.selectedMeter.source == 'Other Fuels' || this.selectedMeter.source == 'Natural Gas') {
      this.showEmissionsSection = (this.generalUtilityDataFilters.stationaryBiogenicEmmissions || this.generalUtilityDataFilters.stationaryCarbonEmissions || this.generalUtilityDataFilters.stationaryOtherEmissions || this.generalUtilityDataFilters.totalEmissions) && this.showEmissions;
      if (this.showEmissions) {
        if (this.generalUtilityDataFilters.stationaryBiogenicEmmissions) {
          this.numEmissions++;
        }
        if (this.generalUtilityDataFilters.stationaryCarbonEmissions) {
          this.numEmissions++;
        }
        if (this.generalUtilityDataFilters.stationaryOtherEmissions) {
          this.numEmissions++;
        }
        if (this.generalUtilityDataFilters.totalEmissions) {
          this.numEmissions++;
        }
      }
    } else {
      this.showEmissionsSection = this.generalUtilityDataFilters.totalEmissions && this.showEmissions;
      if (this.showEmissions) {
        if (this.generalUtilityDataFilters.totalEmissions) {
          this.numEmissions++;
        }
      }
    }

    this.showDetailedCharges = (this.generalUtilityDataFilters.commodityCharge || this.generalUtilityDataFilters.deliveryCharge || this.generalUtilityDataFilters.otherCharge);

    if (this.generalUtilityDataFilters.totalVolume && this.showVolumeColumn) {
      this.numGeneralInformation++;
    }
    if (!this.showEnergyColumn) {
      this.numGeneralInformation--;
    }
    if (this.generalUtilityDataFilters.totalCost) {
      this.numGeneralInformation++;
    }
    if (this.generalUtilityDataFilters.commodityCharge) {
      this.numDetailedCharges++;
    }
    if (this.generalUtilityDataFilters.deliveryCharge) {
      this.numDetailedCharges++;
    }
    if (this.generalUtilityDataFilters.otherCharge) {
      this.numDetailedCharges++;
    }
  }
}

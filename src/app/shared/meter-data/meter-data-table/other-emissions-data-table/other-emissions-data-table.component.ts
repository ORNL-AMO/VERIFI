import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { VehicleDataFilters } from 'src/app/models/meterDataFilter';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';

@Component({
  selector: 'app-other-emissions-data-table',
  templateUrl: './other-emissions-data-table.component.html',
  styleUrls: ['./other-emissions-data-table.component.css']
})
export class OtherEmissionsDataTableComponent {
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
  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  copyingTable: boolean = false;
  filterSub: Subscription;
  vehicleDataFilters: VehicleDataFilters;
  showEstimated: boolean;

  numGeneralInformation: number;
  numEmissions: number;
  numDetailedCharges: number;

  showEmissionsSection: boolean;
  showDetailedCharges: boolean;
  volumeUnit: string;
  energyUnit: string
  constructor(private utilityMeterDataService: UtilityMeterDataService,
    private copyTableService: CopyTableService,
    private customFuelDbService: CustomFuelDbService,
    private facilityDbService: FacilitydbService) {

  }

  ngOnInit(): void {

    if (this.selectedMeterData.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.selectedMeterData.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }

    this.filterSub = this.utilityMeterDataService.tableVehicleDataFilters.subscribe(val => {
      this.vehicleDataFilters = val;
      this.setNumColumns();
    })

  }

  ngOnDestory() {
    this.filterSub.unsubscribe();
  }

  ngOnChanges() {
    this.setData();
  }

  setData() {
    this.volumeUnit = this.selectedMeter.startingUnit;
    this.showEstimated = (this.selectedMeterData.find(dataItem => { return dataItem.isEstimated == true })) != undefined;
    this.setEmissions();
    this.energyUnit = this.selectedMeter.energyUnit;
    if (this.vehicleDataFilters) {
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
    this.selectedMeterData.forEach(dataItem => {
      let emissionsValues: EmissionsResults = getEmissions(this.selectedMeter, dataItem.totalEnergyUse, this.selectedMeter.energyUnit, new Date(dataItem.readDate).getFullYear(), false, [facility], [], customFuels, dataItem.totalVolume, this.selectedMeter.vehicleCollectionUnit, this.selectedMeter.vehicleDistanceUnit, dataItem.heatCapacity);
      dataItem.processEmissions = emissionsValues.processEmissions;
      dataItem.fugitiveEmissions = emissionsValues.fugitiveEmissions;
    })
  }


  setNumColumns() {
    this.numDetailedCharges = 0;
    this.numGeneralInformation = 3;
    this.numEmissions = 0;
    this.showEmissionsSection = (this.vehicleDataFilters.mobileOtherEmissions || this.vehicleDataFilters.mobileBiogenicEmissions || this.vehicleDataFilters.mobileCarbonEmissions || this.vehicleDataFilters.mobileTotalEmissions);
    this.showDetailedCharges = this.vehicleDataFilters.otherCharge;
    if (this.vehicleDataFilters.mobileOtherEmissions) {
      this.numEmissions++;
    }
    if (this.vehicleDataFilters.mobileBiogenicEmissions) {
      this.numEmissions++;
    }
    if (this.vehicleDataFilters.mobileCarbonEmissions) {
      this.numEmissions++;
    }
    if (this.vehicleDataFilters.mobileTotalEmissions) {
      this.numEmissions++;
    }
    if (!this.vehicleDataFilters.totalCost) {
      this.numGeneralInformation--;
    }
    if (!this.vehicleDataFilters.totalEnergy) {
      this.numGeneralInformation--;
    }
    if (this.vehicleDataFilters.totalCost) {
      this.numGeneralInformation++;
    }

    if (this.vehicleDataFilters.otherCharge) {
      this.numDetailedCharges++;
    }
  }
}

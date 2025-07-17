import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { AdditionalChargesFilters, DetailedChargesFilters, EmissionsFilters, GeneralInformationFilters } from 'src/app/models/meterDataFilter';
import { EmissionsResults, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { getEmissions, setUtilityDataEmissionsValues } from 'src/app/calculations/emissions-calculations/emissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { ElectronService } from 'src/app/electron/electron.service';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css'],
  standalone: false
})
export class ElectricityDataTableComponent implements OnInit {
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


  electricityDataFilterSub: Subscription;
  detailedChargesFilters: DetailedChargesFilters;
  additionalChargesFilters: AdditionalChargesFilters;
  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
  allChecked: boolean;
  energyUnit: string;

  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  copyingTable: boolean = false;
  numDetailedCharges: number;
  numAdditionalCharges: number;
  numGeneralInformation: number;
  numEmissions: number;
  showEstimated: boolean;
  isRECs: boolean;
  isElectron: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private copyTableService: CopyTableService,
    private eGridService: EGridService, private facilityDbService: FacilitydbService,
    private customFuelDbService: CustomFuelDbService,
    private accountDbService: AccountdbService,
    private electronService: ElectronService) { }

  ngOnInit(): void {
    this.isElectron = this.electronService.isElectron;
    this.setIsRECs();
    this.energyUnit = this.selectedMeter.startingUnit;
    if (this.selectedMeterData.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.selectedMeterData.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }
    this.electricityDataFilterSub = this.utilityMeterDataService.tableElectricityFilters.subscribe(electricityDataFilters => {
      this.detailedChargesFilters = electricityDataFilters.detailedCharges;
      this.additionalChargesFilters = electricityDataFilters.additionalCharges;
      this.generalInformationFilters = electricityDataFilters.generalInformationFilters;
      this.emissionsFilters = electricityDataFilters.emissionsFilters;
      this.setColumnNumbers();
    });
  }

  ngOnDestroy() {
    this.electricityDataFilterSub.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.itemsPerPage && !changes.itemsPerPage.firstChange) {
      this.allChecked = false;
      this.checkAll();
    }
    if (changes.selectedMeter && !changes.selectedMeter.firstChange) {
      this.energyUnit = this.selectedMeter.startingUnit;
      this.setIsRECs();
    }
    if (changes.selectedMeterData) {
      this.showEstimated = (this.selectedMeterData.find(dataItem => { return dataItem.isEstimated == true })) != undefined;
    }
    this.setEmissions();
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

  setIsRECs() {
    this.isRECs = (this.selectedMeter.agreementType == 4 || this.selectedMeter.agreementType == 6);
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
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let co2EmissionsRates: Array<SubregionEmissions> = this.eGridService.co2Emissions.map(rate => { return rate });
    this.selectedMeterData.forEach(dataItem => {
      let emissionsValues: EmissionsResults = getEmissions(this.selectedMeter, dataItem.totalEnergyUse, this.selectedMeter.energyUnit, new Date(dataItem.readDate).getFullYear(), false, [facility], co2EmissionsRates, customFuels, 0, undefined, undefined, dataItem.heatCapacity, account.assessmentReportVersion);
      dataItem = setUtilityDataEmissionsValues(dataItem, emissionsValues);
    });
  }

  setColumnNumbers() {
    let additionalChargesCount: number = 0;
    Object.keys(this.additionalChargesFilters).forEach(key => {
      if (key != 'showSection' && this.additionalChargesFilters[key] == true) {
        additionalChargesCount++;
      }
    });
    this.numAdditionalCharges = additionalChargesCount;
    let detailedChargesCount: number = 0;
    Object.keys(this.detailedChargesFilters).forEach(key => {
      if (key != 'showSection' && this.detailedChargesFilters[key] == true) {
        detailedChargesCount++;
      }
    });
    this.numDetailedCharges = detailedChargesCount * 2;

    let emissionCount: number = 0;
    Object.keys(this.emissionsFilters).forEach(key => {
      if (key != 'showSection' && this.emissionsFilters[key] == true) {
        emissionCount++;
      }
    });
    this.numEmissions = emissionCount;

    let generalInfoCount: number = 0;
    Object.keys(this.generalInformationFilters).forEach(key => {
      if (key != 'showSection' && this.generalInformationFilters[key] == true) {
        generalInfoCount++;
      }
    });
    this.numGeneralInformation = generalInfoCount + 2;
  }
}

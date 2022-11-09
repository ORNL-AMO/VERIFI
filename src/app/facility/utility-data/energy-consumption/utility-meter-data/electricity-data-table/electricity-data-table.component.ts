import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { CalanderizationService, EmissionsResults } from 'src/app/shared/helper-services/calanderization.service';
import { AdditionalChargesFilters, DetailedChargesFilters, EmissionsFilters, GeneralInformationFilters } from 'src/app/models/meterDataFilter';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css', '../utility-meter-data.component.css']
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
  constructor(private utilityMeterDataService: UtilityMeterDataService, private copyTableService: CopyTableService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
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
      if(this.selectedMeter.includeInEnergy == false){
        dataItem.totalEnergyUse = 0;
      }
    })
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

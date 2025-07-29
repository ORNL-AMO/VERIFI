import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { checkShowHeatCapacity, getIsEnergyUnit } from '../sharedHelperFuntions';
import { ScopeOption, ScopeOptions } from 'src/app/models/scopeOption';
import { AgreementType, AgreementTypes } from 'src/app/models/agreementType';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { VehicleTypes } from '../vehicle-data/vehicleType';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter, MeterCharge, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { checkSameMonth } from 'src/app/data-management/data-management-import/import-services/upload-helper-functions';
import { FirstNaicsList, NAICS, SecondNaicsList } from '../form-data/naics-data';
import { ChargesTypes, MeterChargeType } from '../shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';

@Injectable({
  providedIn: 'root'
})
export class ExportToExcelTemplateV3Service {

  alphabet: Array<string>;
  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService) { }


  exportFacilityData(facilityId?: string) {
    this.setAlphabet();
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/VERIFI-Import-Data-New.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        this.fillWorkbook(workbook, facilityId);
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          let date = new Date();
          let datePipe = new DatePipe('en-us');
          let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
          let accountName: string = account.name;
          accountName = accountName.replaceAll(' ', '-');
          accountName = accountName.replaceAll('.', '_');
          a.download = accountName + "-" + datePipe.transform(date, 'MM-dd-yyyy');
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.loadingService.setLoadingStatus(false);
        });
      })
    };
    this.loadingService.setLoadingMessage('Exporting to .xlsx template');
    this.loadingService.setLoadingStatus(true);
    request.send();
  }

  fillWorkbook(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Workbook {
    this.utilityMeterDbService.setTemporaryMeterNumbersForExport();
    this.setFacilityWorksheet(workbook, facilityId);
    this.setElectricityMetersWorksheet(workbook, facilityId);
    this.setElectricityDataWorksheet(workbook, facilityId);
    return workbook;
  }

  //===== Facility Worksheet =====//
  setFacilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Facilities');
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      accountFacilities = accountFacilities.filter(facility => { return facility.guid == facilityId });
    }
    let index: number = 3;
    accountFacilities.forEach(facility => {
      //A: Facility Name
      worksheet.getCell('A' + index).value = facility.name;
      //B: Address
      worksheet.getCell('B' + index).value = facility.address;
      //C: Country
      worksheet.getCell('C' + index).value = this.getCountry(facility);
      //D: State
      worksheet.getCell('D' + index).value = facility.state;
      //E: City
      worksheet.getCell('E' + index).value = facility.city;
      //F: Zip
      worksheet.getCell('F' + index).value = facility.zip;
      //G: NAICS Code 2 Digit
      let firstNaics: NAICS = FirstNaicsList.find(listNaics => {
        return listNaics.code == facility.naics1;
      });
      if (firstNaics) {
        worksheet.getCell('G' + index).value = firstNaics.matchNum + ' - ' + firstNaics.industryType;
      }
      //H: NAICS Code 3 Digit
      let secondNaics = SecondNaicsList.find(listNaics => {
        return listNaics.code == facility.naics2;
      });
      if (secondNaics) {
        worksheet.getCell('H' + index).value = secondNaics.matchNum + ' - ' + secondNaics.industryType;
      }
      //I: Contact Name
      worksheet.getCell('I' + index).value = facility.contactName;
      //J: Contact Phone
      worksheet.getCell('J' + index).value = facility.contactPhone;
      //K: Contact Email
      worksheet.getCell('K' + index).value = facility.contactEmail;
      index++;
    })
    return worksheet;
  }

  getCountry(facility: IdbFacility): string {
    if (facility.country) {
      return facility.country;
    } else if (facility.state) {
      return 'United States of America (the)';
    };
    return;
  }

  //===== Electricity Meters =====//
  setElectricityMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Electricity Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    facilityMeters.forEach(meter => {
      let facilityName: string = accountFacilities.find(facility => { return facility.guid == meter.facilityId }).name;
      //A: Facility name
      worksheet.getCell('A' + index).value = facilityName;
      //B: Metter Number (unique)
      worksheet.getCell('B' + index).value = meter.meterNumber;
      //C: Meter Name
      worksheet.getCell('C' + index).value = meter.name;
      //D: Meter Group
      worksheet.getCell('D' + index).value = this.getGroupName(meter.groupId);
      //E: Calendarize Readings?
      worksheet.getCell('E' + index).value = this.getCalanderizeDataOption(meter.meterReadingDataApplication);
      //F: Unit (USAGE)
      worksheet.getCell('F' + index).value = meter.startingUnit;
      //G: Unit (DEMAND)
      worksheet.getCell('G' + index).value = meter.demandUnit;
      //H: Site to source
      worksheet.getCell('H' + index).value = meter.siteToSource;
      //I: Agreement Type
      let selectedType: AgreementType = AgreementTypes.find(type => { return meter.agreementType == type.value });
      if (selectedType) {
        worksheet.getCell('I' + index).value = selectedType.typeLabel;
      }
      //J: Retain RECs?
      worksheet.getCell('J' + index).value = meter.retainRECs ? 'Yes' : 'No';
      //K: Account #
      worksheet.getCell('K' + index).value = meter.accountNumber;
      //L: Supplier
      worksheet.getCell('L' + index).value = meter.supplier;
      //M: Location
      worksheet.getCell('M' + index).value = meter.location;
      //N: Notes
      worksheet.getCell('N' + index).value = meter.notes;
      //Charges
      this.addChargesToWorksheet(worksheet, 'O', index, meter);
      index++;
    });
    return worksheet;
  }

  setElectricityDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Electricity');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 3;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        //D: Total Real Demand
        worksheet.getCell('D' + index).value = dataReading.totalRealDemand;
        //E: Power Factor
        worksheet.getCell('E' + index).value = dataReading.powerFactor;
        //F: Total Cost
        worksheet.getCell('F' + index).value = dataReading.totalCost;
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'G', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }


  //===== Stationary Meters =====//


  //===== Mobile Meters =====//

  //===== Other Energy Meters =====//

  //===== Water Meters =====//

  //===== Charges =====//
  addChargesToWorksheet(worksheet: ExcelJS.Worksheet, alpha: string, rowIndex: number, meter: IdbUtilityMeter) {
    meter.charges.forEach(charge => {
      worksheet.getCell(alpha + rowIndex).value = charge.name;
      alpha = this.getNextAlpha(alpha);
      worksheet.getCell(alpha + rowIndex).value = ChargesTypes.find(type => { return type.value == charge.chargeType })?.label;
      rowIndex++;
    })
  }

  addChargeReadingsToWorksheet(worksheet: ExcelJS.Worksheet, alpha: string, rowIndex: number, meter: IdbUtilityMeter, meterData: IdbUtilityMeterData) {
    meterData.charges.forEach(mDataCharge => {
      let charge: MeterCharge = meter.charges.find(charge => { return charge.guid == mDataCharge.chargeGuid });

      worksheet.getCell(alpha + rowIndex).value = charge.name;
      alpha = this.getNextAlpha(alpha);
      if (charge.chargeType == 'consumption' || charge.chargeType == 'demand') {
        worksheet.getCell(alpha + rowIndex).value = mDataCharge.chargeUsage;
      }
      alpha = this.getNextAlpha(alpha);
      worksheet.getCell(alpha + rowIndex).value = mDataCharge.chargeAmount;
      rowIndex++;
    })
  }

  setAlphabet() {
    let alpha = Array.from(Array(26)).map((e, i) => i + 65);
    this.alphabet = alpha.map(x => { return String.fromCharCode(x) });
    let additionalAlphabet: Array<string> = alpha.map(x => { return 'A' + String.fromCharCode(x) });
    this.alphabet = this.alphabet.concat(additionalAlphabet);
    additionalAlphabet = alpha.map(x => { return 'B' + String.fromCharCode(x) });
    this.alphabet = this.alphabet.concat(additionalAlphabet);
  }

  getNextAlpha(alpha: string): string {
    let alphaIndex: number = this.alphabet.findIndex(a => { return a === alpha });
    return this.alphabet[alphaIndex + 1];
  }

  //===== Predictors =====//

  //===== Helper functions =====//
  getGroupName(groupId: string): string {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let group: IdbUtilityMeterGroup = groups.find(group => { return group.guid == groupId });
    if (group) {
      return group.name;
    }
    return '';
  }

  getCalanderizeDataOption(meterReadingDataApplication: MeterReadingDataApplication): 'Yes' | 'No' | 'Evenly Distribute' {
    if (meterReadingDataApplication == 'backward') {
      return 'Yes';
    } else if (meterReadingDataApplication == 'fullMonth') {
      return 'No';
    } else if (meterReadingDataApplication == 'fullYear') {
      return 'Evenly Distribute';
    };
  }

  getFormatedDate(dateReading: Date): string {
    let readingDate: Date = new Date(dateReading)
    return readingDate.getFullYear() + '-' + (readingDate.getMonth() + 1) + '-' + readingDate.getDate();
  }
}

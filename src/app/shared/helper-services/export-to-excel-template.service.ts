import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup, MeterReadingDataApplication } from 'src/app/models/idb';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { getIsEnergyUnit } from '../sharedHelperFuntions';
import { ScopeOption, ScopeOptions } from 'src/app/models/scopeOption';
import { AgreementType, AgreementTypes } from 'src/app/models/agreementType';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { VehicleTypes } from '../vehicle-data/vehicleType';

@Injectable({
  providedIn: 'root'
})
export class ExportToExcelTemplateService {

  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }


  exportFacilityData(facilityId?: string) {

    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/VERIFI-Import-Data.xlsx', true);
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
    this.getFacilityWorksheet(workbook, facilityId);
    this.getMetersWorksheet(workbook, facilityId);
    this.getElectricityWorksheet(workbook, facilityId);
    this.getNonElectricityWorksheet(workbook, facilityId);
    this.getPredictorWorksheet(workbook, facilityId);
    return workbook;
  }

  getFacilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Facilities');
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      accountFacilities = accountFacilities.filter(facility => { return facility.guid == facilityId });
    }
    let index: number = 2;
    accountFacilities.forEach(facility => {
      worksheet.getCell('A' + index).value = facility.name;
      worksheet.getCell('B' + index).value = facility.address;
      worksheet.getCell('C' + index).value = this.getCountry(facility);
      worksheet.getCell('D' + index).value = facility.state;
      worksheet.getCell('E' + index).value = facility.city;
      worksheet.getCell('F' + index).value = facility.zip;
      worksheet.getCell('G' + index).value = facility.naics2;
      worksheet.getCell('H' + index).value = facility.naics3;
      worksheet.getCell('I' + index).value = facility.contactName;
      worksheet.getCell('J' + index).value = facility.contactPhone;
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

  getMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Meters-Utilities');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 2;
    facilityMeters.forEach(meter => {
      let facilityName: string = accountFacilities.find(facility => { return facility.guid == meter.facilityId }).name;
      //A: Facility name
      worksheet.getCell('A' + index).value = facilityName;
      //B: Metter Number (unique)
      worksheet.getCell('B' + index).value = meter.meterNumber;
      //C: Source
      worksheet.getCell('C' + index).value = meter.source;
      //D: Scope
      worksheet.getCell('D' + index).value = this.getScope(meter.scope);
      //E: Meter Name (Display)
      worksheet.getCell('E' + index).value = meter.name;
      //F: Meter Group
      worksheet.getCell('F' + index).value = this.getGroupName(meter.groupId);
      //G: Calendarize Data?
      worksheet.getCell('G' + index).value = this.getCalanderizeDataOption(meter.meterReadingDataApplication);
      //H: Phase or Vehicle
      worksheet.getCell('H' + index).value = meter.location;
      //I: Fuel or Emissions
      worksheet.getCell('I' + index).value = meter.group;
      //J: Collection Unit
      worksheet.getCell('J' + index).value = meter.phase;
      //K: Energy Unit
      //L: Distance Unit
      //M: Estimation Method
      //N: Heat Capacity or Fuel Efficiency
      //O: Include in Energy
      //P: Site To Source
      //Q: Agreement Type
      //R: Retain RECs
      //S: Account Number
      //T: Utility Supplier
      //U: Notes
      //V: Building / Location
      if (meter.source == 'Water Discharge') {
        worksheet.getCell('K' + index).value = meter.waterDischargeType;
      } else if (meter.source == 'Water Intake') {
        worksheet.getCell('K' + index).value = meter.waterIntakeType;
      } else {
        worksheet.getCell('K' + index).value = meter.fuel;
      }
      worksheet.getCell('L' + index).value = meter.startingUnit;
      worksheet.getCell('M' + index).value = meter.heatCapacity;
      worksheet.getCell('N' + index).value = meter.siteToSource;
      worksheet.getCell('O' + index).value = this.getCalendarization(meter.meterReadingDataApplication);
      worksheet.getCell('P' + index).value = this.getScope(meter.scope);
      worksheet.getCell('Q' + index).value = this.getAgreementType(meter.agreementType);
      worksheet.getCell('R' + index).value = this.getYesNo(meter.includeInEnergy);
      worksheet.getCell('S' + index).value = this.getYesNo(meter.retainRECs);
      index++;
    })
    return worksheet;
  }

  getYesNo(bool: boolean): 'Yes' | 'No' {
    if (bool) {
      return 'Yes';
    }
    return 'No';
  }

  getScope(scope: number): string {
    let selectedScope: ScopeOption = ScopeOptions.find(option => { return option.value == scope });
    if (selectedScope) {
      return selectedScope.scope + ': ' + selectedScope.optionLabel;
    }
    return;
  }

  getAgreementType(agreementType: number): string {
    let selectedType: AgreementType = AgreementTypes.find(type => { return agreementType == type.value });
    if (selectedType) {
      return selectedType.typeLabel;
    }
    return;
  }

  getElectricityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Electricity');
    // worksheet.getCell('A1').value = 'Meter Number';
    // worksheet.getCell('B1').value = 'Read Date';
    // worksheet.getCell('C1').value = 'Total Consumption';
    // worksheet.getCell('D1').value = 'Total Real Demand';
    // worksheet.getCell('E1').value = 'Total Billed Demand';
    // worksheet.getCell('F1').value = 'Total Cost';
    // worksheet.getCell('G1').value = 'Non-energy Charge';
    // worksheet.getCell('H1').value = 'Block 1 Consumption';
    // worksheet.getCell('I1').value = 'Block 1 Consumption Charge';
    // worksheet.getCell('J1').value = 'Block 2 Consumption';
    // worksheet.getCell('K1').value = 'Block 2 Consumption Charge';
    // worksheet.getCell('L1').value = 'Block 3 Consumption';
    // worksheet.getCell('M1').value = 'Block 3 Consumption Charge';
    // worksheet.getCell('N1').value = 'Other Consumption';
    // worksheet.getCell('O1').value = 'Other Consumption Charge';
    // worksheet.getCell('P1').value = 'On Peak Amount';
    // worksheet.getCell('Q1').value = 'On Peak Charge';
    // worksheet.getCell('R1').value = 'Off Peak Amount';
    // worksheet.getCell('S1').value = 'Off Peak Charge';
    // worksheet.getCell('T1').value = 'Transmission & Delivery Charge';
    // worksheet.getCell('U1').value = 'Power Factor';
    // worksheet.getCell('V1').value = 'Power Factor Charge';
    // worksheet.getCell('W1').value = 'Local Sales Tax';
    // worksheet.getCell('X1').value = 'State Sales Tax';
    // worksheet.getCell('Y1').value = 'Late Payment';
    // worksheet.getCell('Z1').value = 'Other Charge';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 2;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //format date!!!!!!
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        worksheet.getCell('D' + index).value = dataReading.totalRealDemand;
        worksheet.getCell('E' + index).value = dataReading.totalBilledDemand;
        worksheet.getCell('F' + index).value = dataReading.totalCost;
        worksheet.getCell('G' + index).value = dataReading.nonEnergyCharge;
        worksheet.getCell('H' + index).value = dataReading.block1Consumption;
        worksheet.getCell('I' + index).value = dataReading.block1ConsumptionCharge;
        worksheet.getCell('J' + index).value = dataReading.block2Consumption;
        worksheet.getCell('K' + index).value = dataReading.block2ConsumptionCharge;
        worksheet.getCell('L' + index).value = dataReading.block3Consumption;
        worksheet.getCell('M' + index).value = dataReading.block3ConsumptionCharge;
        worksheet.getCell('N' + index).value = dataReading.otherConsumption;
        worksheet.getCell('O' + index).value = dataReading.otherConsumptionCharge;
        worksheet.getCell('P' + index).value = dataReading.onPeakAmount;
        worksheet.getCell('Q' + index).value = dataReading.onPeakCharge;
        worksheet.getCell('R' + index).value = dataReading.offPeakAmount;
        worksheet.getCell('S' + index).value = dataReading.offPeakCharge;
        worksheet.getCell('T' + index).value = dataReading.totalRealDemand;
        worksheet.getCell('U' + index).value = dataReading.powerFactor;
        worksheet.getCell('V' + index).value = dataReading.powerFactorCharge;
        worksheet.getCell('W' + index).value = dataReading.localSalesTax;
        worksheet.getCell('X' + index).value = dataReading.stateSalesTax;
        worksheet.getCell('Y' + index).value = dataReading.latePayment;
        worksheet.getCell('Z' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  getNonElectricityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Non-electricity');
    // worksheet.getCell('A1').value = 'Meter Number';
    // worksheet.getCell('B1').value = 'Read Date';
    // worksheet.getCell('C1').value = 'Total Consumption';
    // worksheet.getCell('D1').value = 'Total Cost';
    // worksheet.getCell('E1').value = 'Commodity Charge';
    // worksheet.getCell('F1').value = 'Delivery Charge';
    // worksheet.getCell('G1').value = 'Other Charge';
    // worksheet.getCell('H1').value = 'Demand Usage';
    // worksheet.getCell('I1').value = 'Demand Charge';
    // worksheet.getCell('J1').value = 'Local Sales Tax';
    // worksheet.getCell('K1').value = 'State Sales Tax';
    // worksheet.getCell('L1').value = 'Late Payment';
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source != 'Electricity' });
    let index: number = 2;
    electricityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        worksheet.getCell('A' + index).value = meter.meterNumber;
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        if (getIsEnergyUnit(meter.startingUnit)) {
          worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        } else {
          worksheet.getCell('C' + index).value = dataReading.totalVolume;
        }
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        worksheet.getCell('E' + index).value = dataReading.commodityCharge;
        worksheet.getCell('F' + index).value = dataReading.deliveryCharge;
        worksheet.getCell('G' + index).value = dataReading.otherCharge;
        worksheet.getCell('H' + index).value = dataReading.demandUsage;
        worksheet.getCell('I' + index).value = dataReading.demandCharge;
        worksheet.getCell('J' + index).value = dataReading.localSalesTax;
        worksheet.getCell('K' + index).value = dataReading.stateSalesTax;
        worksheet.getCell('L' + index).value = dataReading.latePayment;
        index++;
      })
    })
    return worksheet;
  }

  getPredictorWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Predictors');
    let alpha = Array.from(Array(26)).map((e, i) => i + 65);
    let alphabet: Array<string> = alpha.map(x => { return String.fromCharCode(x) });
    let additionalAlphabet: Array<string> = alpha.map(x => { return 'A' + String.fromCharCode(x) });
    alphabet = alphabet.concat(additionalAlphabet);
    additionalAlphabet = alpha.map(x => { return 'B' + String.fromCharCode(x) });
    alphabet = alphabet.concat(additionalAlphabet);
    // worksheet.getCell('A1').value = 'Facility Name';
    // worksheet.getCell('B1').value = 'Date';
    let alphaIndex: number = 2;

    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      facilities = facilities.filter(facility => { return facility.guid == facilityId });
    }
    let predictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (facilityId) {
      predictorEntries = predictorEntries.filter(entry => { return entry.facilityId == facilityId });
    }
    let predictorCellMap: Array<{ letter: string, predictorName: string }> = new Array();
    if (predictorEntries.length != 0) {
      // predictorEntries[0].predictors.forEach(predictor => {
      let predictorNames: Array<string> = this.getAllPredictorNames(predictorEntries, facilities);
      predictorNames.forEach(name => {
        let letter: string = alphabet[alphaIndex];
        worksheet.getCell(letter + '1').value = name;
        predictorCellMap.push({
          letter: letter,
          predictorName: name
        })
        alphaIndex++;
      });
      let index: number = 2;
      predictorEntries.forEach(entry => {
        let facilityName: string = facilities.find(facility => { return facility.guid == entry.facilityId }).name;
        worksheet.getCell('A' + index).value = facilityName;
        worksheet.getCell('B' + index).value = this.getFormatedDate(entry.date)
        // alphaIndex = 1;
        entry.predictors.forEach(predictor => {
          // let letter: string = alphabet[alphaIndex];
          let findItem: { letter: string, predictorName: string } = predictorCellMap.find(mapObj => {
            return mapObj.predictorName == predictor.name
          })
          if (!findItem) {
            console.log('Missing Predictor Entry: ' + predictor.name)
          } else {
            let letter = findItem.letter;
            worksheet.getCell(letter + index).value = predictor.amount;
          }
          // alphaIndex++;
        });
        index++;
      });
    }
    return worksheet;
  }


  getAllPredictorNames(predictorEntries: Array<IdbPredictorEntry>, facilities: Array<IdbFacility>): Array<string> {
    let predictorNames: Array<string> = new Array();
    facilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictorEntry> = predictorEntries.filter(entry => { return entry.facilityId == facility.guid });
      if (facilityPredictors.length > 0) {
        let facilityPredictorNames: Array<string> = facilityPredictors[0].predictors.map(predictor => { return predictor.name })
        predictorNames = _.union(predictorNames, facilityPredictorNames)
      }
    });
    return predictorNames;
  }

  getFormatedDate(dateReading: Date): string {
    let readingDate: Date = new Date(dateReading)
    return readingDate.getFullYear() + '-' + (readingDate.getMonth() + 1) + '-' + readingDate.getDate();
  }

  getGroupName(groupId: string): string {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let group: IdbUtilityMeterGroup = groups.find(group => { return group.guid == groupId });
    if (group) {
      return group.name;
    }
    return '';
  }

  getCalanderizeDataOption(meterReadingDataApplication: MeterReadingDataApplication): 'Calendarize' | 'Do Not Calenderize' | 'Evenly Distribute' {
    if (meterReadingDataApplication == 'backward') {
      return 'Calendarize';
    } else if (meterReadingDataApplication == 'fullMonth') {
      return 'Do Not Calenderize';
    } else if (meterReadingDataApplication == 'fullYear') {
      return 'Evenly Distribute';
    };
  }

  getPhaseOrVehicle(meter: IdbUtilityMeter): string {
    if(meter.scope == 2){
      if(meter.vehicleCategory == 1){
        return 'Material Transport Onsite';
      }else if(meter.vehicleCategory == 2){
        let vehicleType = VehicleTypes.find(vType => {
          return vType.value == meter.vehicleType
        });
        if(vehicleType.label == 'Passenger Cars'){
          return 'On-Road Vehicle, Passenger Cars';
        }else if(vehicleType.label == "Light-Duty Trucks (Vans, Pickups, SUV's)"){
          return 'On-Road Vehicle, Light-Duty Trucks';
        }else if(vehicleType.label == 'Bus'){
          return 'On-Road Vehicle, Bus';
        }else if(vehicleType.label == 'Heavy-Duty Vehicles'){
          return 'On-Road Vehicle, Heavy-Duty Trucks';
        }else if(vehicleType.label == 'Motorcycles'){
          return 'On-Road Vehicle, Motorcycles';
        }
      }
           
      // Off-Road Vehicle, Ag. Equipment & Trucks
      // Off-Road Vehicle, Construction/Mine Equipment & Trucks
      // Non-Road Vehicle, Aircraft
      // Non-Road Vehicle, Rail
      // Non-Road Vehicle, Water Transport
    }else if(meter.source == 'Other Fuels'){
      return meter.phase;
    }
  }

}

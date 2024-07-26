import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictorEntry } from 'src/app/models/idb';
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
import { IdbUtilityMeter, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

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
    this.utilityMeterDbService.setTemporaryMeterNumbersForExport();
    this.setFacilityWorksheet(workbook, facilityId);
    this.setMetersWorksheet(workbook, facilityId);
    this.setElectricityWorksheet(workbook, facilityId);
    this.setStationaryWorksheet(workbook, facilityId);
    this.setMobileWorksheet(workbook, facilityId);
    this.setOtherUtilityWorksheet(workbook, facilityId);
    this.setWaterWorksheet(workbook, facilityId);
    this.setPredictorWorksheet(workbook, facilityId);
    return workbook;
  }

  setFacilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Facilities');
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      accountFacilities = accountFacilities.filter(facility => { return facility.guid == facilityId });
    }
    let index: number = 2;
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
      worksheet.getCell('G' + index).value = facility.naics2;
      //H: NAICS Code 3 Digit
      worksheet.getCell('H' + index).value = facility.naics3;
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

  setMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
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
      worksheet.getCell('H' + index).value = this.getPhaseOrVehicle(meter);
      //I: Fuel or Emissions
      worksheet.getCell('I' + index).value = this.getFuelOrEmission(meter);
      //J: Collection Unit
      worksheet.getCell('J' + index).value = this.getCollectionUnit(meter);
      //K: Energy Unit
      worksheet.getCell('K' + index).value = meter.energyUnit;
      //L: Distance Unit
      worksheet.getCell('L' + index).value = this.getDistanceUnit(meter);
      //M: Estimation Method
      worksheet.getCell('M' + index).value = this.getEstimationMethod(meter);
      //N: Heat Capacity or Fuel Efficiency
      worksheet.getCell('N' + index).value = this.getHeatCapacityOrEfficiency(meter);
      //O: Include in Energy
      worksheet.getCell('O' + index).value = this.getYesNo(meter.includeInEnergy);
      //P: Site To Source
      worksheet.getCell('P' + index).value = meter.siteToSource;
      //Q: Agreement Type
      worksheet.getCell('Q' + index).value = this.getAgreementType(meter);
      //R: Retain RECs
      worksheet.getCell('R' + index).value = this.getRetainRecs(meter);
      //S: Account Number
      worksheet.getCell('S' + index).value = meter.accountNumber;
      //T: Utility Supplier
      worksheet.getCell('T' + index).value = meter.supplier;
      //U: Notes
      worksheet.getCell('U' + index).value = meter.notes;
      //V: Building / Location
      worksheet.getCell('V' + index).value = meter.location;
      index++;
    })
    return worksheet;
  }

  setElectricityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Electricity');
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
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        //D: Total Real Demand
        worksheet.getCell('D' + index).value = dataReading.totalRealDemand;
        //E: Total Billed Demand
        worksheet.getCell('E' + index).value = dataReading.totalBilledDemand;
        //F: Total Cost
        worksheet.getCell('F' + index).value = dataReading.totalCost;
        //G: Non-energy Chage
        worksheet.getCell('G' + index).value = dataReading.nonEnergyCharge;
        //H: Block 1 Consumption
        worksheet.getCell('H' + index).value = dataReading.block1Consumption;
        //I: Block 1 Consumption Charge
        worksheet.getCell('I' + index).value = dataReading.block1ConsumptionCharge;
        //J: Block 2 Consumption
        worksheet.getCell('J' + index).value = dataReading.block2Consumption;
        //K: Block 2 Consumption Charge
        worksheet.getCell('K' + index).value = dataReading.block2ConsumptionCharge;
        //L: Block 3 Consumption
        worksheet.getCell('L' + index).value = dataReading.block3Consumption;
        //M: Block 2 Consumption Charge
        worksheet.getCell('M' + index).value = dataReading.block3ConsumptionCharge;
        //N: Other Consumption
        worksheet.getCell('N' + index).value = dataReading.otherConsumption;
        //O: Other Consumption Charge
        worksheet.getCell('O' + index).value = dataReading.otherConsumptionCharge;
        //P: On Peak Amount
        worksheet.getCell('P' + index).value = dataReading.onPeakAmount;
        //Q: On Peak Charge
        worksheet.getCell('Q' + index).value = dataReading.onPeakCharge;
        //R: Off Peak Amount
        worksheet.getCell('R' + index).value = dataReading.offPeakAmount;
        //S: Off Peak Charge
        worksheet.getCell('S' + index).value = dataReading.offPeakCharge;
        //T: Transmission & Delivery Charge
        worksheet.getCell('T' + index).value = dataReading.totalRealDemand;
        //U: Power Factor
        worksheet.getCell('U' + index).value = dataReading.powerFactor;
        //V: Power Factor Charge
        worksheet.getCell('V' + index).value = dataReading.powerFactorCharge;
        //W: Local Sales Tax
        worksheet.getCell('W' + index).value = dataReading.localSalesTax;
        //X: State Sales Tax
        worksheet.getCell('X' + index).value = dataReading.stateSalesTax;
        //Y: Late Payment
        worksheet.getCell('Y' + index).value = dataReading.latePayment;
        //Z: Other Charge
        worksheet.getCell('Z' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  setStationaryWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Stationary Fuel - Other Energy');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    //stationary and otehr energy
    let stationaryMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      if (meter.scope == 1) {
        return true;
      } else if (meter.source == 'Other Energy') {
        return true;
      } else {
        return false;
      }
    });
    let index: number = 2;
    stationaryMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        if (getIsEnergyUnit(meter.startingUnit)) {
          worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        } else {
          worksheet.getCell('C' + index).value = dataReading.totalVolume;
        }
        //D: Total Cost
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        //E: Higher Heating Value
        worksheet.getCell('E' + index).value = dataReading.heatCapacity;
        //F: Commodity Charge
        worksheet.getCell('F' + index).value = dataReading.commodityCharge;
        //G: Delivery Charge
        worksheet.getCell('G' + index).value = dataReading.deliveryCharge;
        //H: Other Charge
        worksheet.getCell('H' + index).value = dataReading.otherCharge;
        //I: Demand Usage
        worksheet.getCell('I' + index).value = dataReading.demandUsage;
        //J: Demand Charge
        worksheet.getCell('J' + index).value = dataReading.demandCharge;
        //K: Local Sales Tax
        worksheet.getCell('K' + index).value = dataReading.localSalesTax;
        //L: State Sales Tax
        worksheet.getCell('L' + index).value = dataReading.stateSalesTax;
        //M: Late Payment
        worksheet.getCell('M' + index).value = dataReading.latePayment;
        index++;
      })
    })
    return worksheet;
  }

  setMobileWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Mobile Fuel');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    //mobile meters
    let mobileMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return meter.scope == 2
    });
    let index: number = 2;
    mobileMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption or Total Distance
        worksheet.getCell('C' + index).value = dataReading.totalVolume;
        //D: Fuel Efficiency
        worksheet.getCell('D' + index).value = dataReading.vehicleFuelEfficiency;
        //E: Total Cost
        worksheet.getCell('E' + index).value = dataReading.totalCost;
        //F: Other Charge
        worksheet.getCell('F' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }

  setWaterWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Water');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    //water meters
    let waterMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return meter.source == 'Water Discharge' || meter.source == 'Water Intake';
    });
    let index: number = 2;
    waterMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        worksheet.getCell('C' + index).value = dataReading.totalVolume;
        //D: Total Cost
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        //E: Commodity Charge
        worksheet.getCell('E' + index).value = dataReading.commodityCharge;
        //F: Delivery Charge
        worksheet.getCell('F' + index).value = dataReading.deliveryCharge;
        //G: Other Charge
        worksheet.getCell('G' + index).value = dataReading.otherCharge;
        //H: Demand Usage
        worksheet.getCell('H' + index).value = dataReading.demandUsage;
        //I: Demand Charge
        worksheet.getCell('I' + index).value = dataReading.demandCharge;
        //J: Local Sales Tax
        worksheet.getCell('J' + index).value = dataReading.localSalesTax;
        //K: State Sales Tax
        worksheet.getCell('K' + index).value = dataReading.stateSalesTax;
        //L: Late Payment
        worksheet.getCell('L' + index).value = dataReading.latePayment;
        index++;
      })
    })
    return worksheet;
  }

  setOtherUtilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Other Utility - Emission');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    //other meters
    let otherMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return meter.source == 'Other'
    });
    let index: number = 2;
    otherMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption or Total Distance
        worksheet.getCell('C' + index).value = dataReading.totalVolume;
        //D: Total Cost
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        //E: Other Charge
        worksheet.getCell('E' + index).value = dataReading.otherCharge;
        index++;
      })
    })
    return worksheet;
  }



  setPredictorWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
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

  getAgreementType(meter: IdbUtilityMeter): string {
    if (meter.source == 'Electricity') {
      let selectedType: AgreementType = AgreementTypes.find(type => { return meter.agreementType == type.value });
      if (selectedType) {
        return selectedType.typeLabel;
      }
    }
    return;
  }

  getRetainRecs(meter: IdbUtilityMeter): 'Yes' | 'No' {
    if (meter.source == 'Electricity') {
      return this.getYesNo(meter.retainRECs);
    }
    return;
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
    if (meter.scope == 2) {
      if (meter.vehicleCategory == 1) {
        return 'Material Transport Onsite';
      } else {
        let vehicleType = VehicleTypes.find(vType => {
          return vType.value == meter.vehicleType
        });
        if (vehicleType) {
          if (meter.vehicleCategory == 2) {
            if (vehicleType.label == 'Passenger Cars') {
              return 'On-Road Vehicle, Passenger Cars';
            } else if (vehicleType.label == "Light-Duty Trucks (Vans, Pickups, SUV's)") {
              return 'On-Road Vehicle, Light-Duty Trucks';
            } else if (vehicleType.label == 'Bus') {
              return 'On-Road Vehicle, Bus';
            } else if (vehicleType.label == 'Heavy-Duty Vehicles') {
              return 'On-Road Vehicle, Heavy-Duty Trucks';
            } else if (vehicleType.label == 'Motorcycles') {
              return 'On-Road Vehicle, Motorcycles';
            }
          } else if (meter.vehicleCategory == 3) {
            if (vehicleType.label == 'Agricultural Equipment & Trucks') {
              return 'Off-Road Vehicle, Ag. Equipment & Trucks';
            } else if (vehicleType.label == "Construction/Mining Equipment & Trucks") {
              return 'Off-Road Vehicle, Construction/Mine Equipment & Trucks';
            } else if (vehicleType.label == "Construction/Mining Equipment & Trucks") {
              return 'Off-Road Vehicle, Construction/Mine Equipment & Trucks';
            }
          } else if (meter.vehicleCategory == 4) {
            if (vehicleType.label == 'Aircraft') {
              return 'Non-Road Vehicle, Aircraft';
            } else if (vehicleType.label == "Rail") {
              return 'Non-Road Vehicle, Rail';
            } else if (vehicleType.label == "Water Transport") {
              return ' Non-Road Vehicle, Water Transport';
            }
          }
        }
      }
    } else if (meter.source == 'Other Fuels') {
      return meter.phase;
    }
    return '';
  }

  getFuelOrEmission(meter: IdbUtilityMeter): string {
    if (meter.scope == 2) {
      return meter.vehicleFuel;
    } else if (meter.scope == 5 || meter.scope == 6) {
      let gwpOption: GlobalWarmingPotential = GlobalWarmingPotentials.find(gwpOption => {
        return gwpOption.value == meter.globalWarmingPotentialOption;
      });
      return gwpOption?.label;
    } if (meter.source == 'Water Discharge') {
      return meter.waterDischargeType;
    } else if (meter.source == 'Water Intake') {
      return meter.waterIntakeType;
    } else {
      return meter.fuel;
    }
  }

  getCollectionUnit(meter: IdbUtilityMeter): string {
    if (meter.scope == 2) {
      return meter.vehicleCollectionUnit;
    } else {
      return meter.startingUnit;
    }
  }

  getDistanceUnit(meter: IdbUtilityMeter): string {
    if (meter.scope == 2) {
      return meter.vehicleDistanceUnit;
    }
    return;
  }

  getHeatCapacityOrEfficiency(meter: IdbUtilityMeter): number {
    if (checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope)) {
      return meter.heatCapacity;
    } else if (meter.scope == 2 && meter.vehicleCategory == 2) {
      return meter.vehicleFuelEfficiency;
    }
  }

  getEstimationMethod(meter: IdbUtilityMeter): 'Mileage' | 'Fuel Usage' {
    if (meter.scope == 2 && meter.vehicleCategory == 2) {
      if (meter.vehicleCollectionType == 1) {
        return 'Fuel Usage';
      } else if (meter.vehicleCollectionType == 2) {
        return 'Mileage';
      }
    }
    return;
  }
}

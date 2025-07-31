import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { getIsEnergyUnit } from '../sharedHelperFuntions';
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
    this.loadingService.setLoadingMessage('Adding Facility Details...')
    this.setFacilityWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Electricity Meters...')
    this.setElectricityMetersWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Electricity Data...')
    this.setElectricityDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Stationary Meters...')
    this.setStationaryMetersWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Stationary Data...')
    this.setStationaryDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Mobile Meters...')
    this.setMobileMetersWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Mobile Data...')
    this.setMobileDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Other Energy Meters...')
    this.setOtherEnergyMetersWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Other Energy Data...')
    this.setOtherEnergyDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Other Emissions Meters...')
    this.setOtherEmissionsWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Other Emissions Data...')
    this.setOtherEmissionsDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Water Meters...')
    this.setWaterMetersWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Water Data...')
    this.setWaterDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Predictors...')
    this.setPredictorsWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Adding Predictor Data...')
    this.setPredictorDataWorksheet(workbook, facilityId);
    this.loadingService.setLoadingMessage('Finishing up...');
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
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 3;
    electricityMeters.forEach(meter => {
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
  setStationaryMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Stationary Fuel Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let stationaryMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Natural Gas' || (meter.source == 'Other Fuels' && meter.scope != 2) });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    stationaryMeters.forEach(meter => {
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
      //F: Phase
      worksheet.getCell('F' + index).value = meter.phase;
      //G: Fuel
      if (meter.source == 'Natural Gas') {
        worksheet.getCell('G' + index).value = 'Natural Gas';
      } else {
        worksheet.getCell('G' + index).value = meter.fuel;
      }
      //H: collection unit
      worksheet.getCell('H' + index).value = meter.startingUnit;
      //I: site to source
      worksheet.getCell('I' + index).value = meter.siteToSource;
      //J: energy factor
      worksheet.getCell('J' + index).value = meter.heatCapacity;
      //K: energy unit
      worksheet.getCell('K' + index).value = meter.energyUnit;
      //L: account number
      worksheet.getCell('L' + index).value = meter.accountNumber;
      //M: Supplier
      worksheet.getCell('M' + index).value = meter.supplier;
      //N: Location
      worksheet.getCell('N' + index).value = meter.location;
      //O: Notes
      worksheet.getCell('O' + index).value = meter.notes;
      //Charges
      this.addChargesToWorksheet(worksheet, 'P', index, meter);
      index++;
    });
    return worksheet;
  }

  setStationaryDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Stationary Fuel');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Natural Gas' || (meter.source == 'Other Fuels' && meter.scope != 2) });
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
        if (getIsEnergyUnit(meter.startingUnit)) {
          worksheet.getCell('C' + index).value = dataReading.totalEnergyUse;
        } else {
          worksheet.getCell('C' + index).value = dataReading.totalVolume;
        }
        //D: Total Cost
        worksheet.getCell('D' + index).value = dataReading.totalCost;
        //E: Higher Heating Value
        worksheet.getCell('E' + index).value = dataReading.heatCapacity;
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'F', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }

  //===== Mobile Meters =====//
  setMobileMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Mobile Fuel Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let mobileMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other Fuels' && meter.scope == 2 });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    mobileMeters.forEach(meter => {
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
      //F: Vehicle Type
      worksheet.getCell('F' + index).value = this.getVehicleType(meter);
      //G: Fuel
      worksheet.getCell('G' + index).value = meter.vehicleFuel;
      //H: collection unit
      worksheet.getCell('H' + index).value = meter.vehicleCollectionUnit;
      //I: unit distance
      worksheet.getCell('I' + index).value = meter.vehicleDistanceUnit;
      //J: fuel efficiency
      worksheet.getCell('J' + index).value = meter.vehicleFuelEfficiency;
      //K: vehicle collection type
      worksheet.getCell('K' + index).value = meter.vehicleCollectionType == 1 ? 'Fuel' : 'Mileage';
      //L: site to source
      worksheet.getCell('L' + index).value = meter.siteToSource;
      //M: include with energy
      worksheet.getCell('M' + index).value = meter.includeInEnergy ? 'Yes' : 'No';
      //N: account #
      worksheet.getCell('N' + index).value = meter.accountNumber;
      //O: supplier
      worksheet.getCell('O' + index).value = meter.supplier;
      //P: Location
      worksheet.getCell('P' + index).value = meter.location;
      //Q: Notes
      worksheet.getCell('Q' + index).value = meter.notes;
      //Charges
      this.addChargesToWorksheet(worksheet, 'R', index, meter);
      index++;
    });
    return worksheet;
  }

  setMobileDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Mobile Fuel');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let mobileMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other Fuels' && meter.scope == 2 });
    let index: number = 3;
    mobileMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        worksheet.getCell('C' + index).value = dataReading.totalVolume;
        //D: Higher Heating Value
        worksheet.getCell('D' + index).value = dataReading.vehicleFuelEfficiency;
        //E: Total Cost
        worksheet.getCell('F' + index).value = dataReading.totalCost;
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'G', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }

  getVehicleType(meter: IdbUtilityMeter): string {
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
    return;
  }

  //===== Other Energy Meters =====//
  setOtherEnergyMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Other Energy Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let otherEnergyMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other Energy' });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    otherEnergyMeters.forEach(meter => {
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
      //F: Type
      worksheet.getCell('F' + index).value = meter.fuel;
      //G: Unit collection
      worksheet.getCell('G' + index).value = meter.startingUnit;
      //H: site to source
      worksheet.getCell('H' + index).value = meter.siteToSource;
      //I: energy factor
      worksheet.getCell('I' + index).value = meter.heatCapacity;
      //J: energy unit
      worksheet.getCell('J' + index).value = meter.energyUnit;
      //K: account #
      worksheet.getCell('K' + index).value = meter.accountNumber;
      //L: supplier
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

  setOtherEnergyDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Other Energy');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let otherEnergyMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other Energy' });
    let index: number = 3;
    otherEnergyMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(meter.guid);
      meterData = _.orderBy(meterData, 'readDate');
      meterData.forEach(dataReading => {
        //A: Meter Number
        worksheet.getCell('A' + index).value = meter.meterNumber;
        //B: Read Date
        worksheet.getCell('B' + index).value = this.getFormatedDate(dataReading.readDate);
        //C: Total Consumption
        worksheet.getCell('C' + index).value = dataReading.totalVolume;
        //D: Energy factor
        worksheet.getCell('D' + index).value = dataReading.heatCapacity;
        //E: Total Cost
        worksheet.getCell('E' + index).value = dataReading.totalCost;
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'F', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }

  //===== Other Emissions Meters =====//
  setOtherEmissionsWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Other Emission Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let otherMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other' });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    otherMeters.forEach(meter => {
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
      //F: Type
      if (meter.scope == 5) {
        worksheet.getCell('F' + index).value = 'Scope 1: Fugitive';
      } else if (meter.scope == 6) {
        worksheet.getCell('F' + index).value = 'Scope 1: Process';
      } else {
        worksheet.getCell('F' + index).value = 'Other';
      }
      //G: greenhoue gas
      let gwpOption: GlobalWarmingPotential = GlobalWarmingPotentials.find(gwpOption => {
        return gwpOption.value == meter.globalWarmingPotentialOption;
      });
      worksheet.getCell('G' + index).value = gwpOption?.label;
      //H: Unit collection
      worksheet.getCell('H' + index).value = meter.startingUnit;
      //I: Location
      worksheet.getCell('I' + index).value = meter.location;
      //J: Notes
      worksheet.getCell('J' + index).value = meter.notes;
      //Charges
      this.addChargesToWorksheet(worksheet, 'K', index, meter);
      index++;
    });
    return worksheet;
  }

  setOtherEmissionsDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Other Emissions');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let otherMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Other' });
    let index: number = 3;
    otherMeters.forEach(meter => {
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
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'E', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }


  //===== Water Meters =====//
  setWaterMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Water Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let waterMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let index: number = 3;
    waterMeters.forEach(meter => {
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

      if (meter.source == 'Water Discharge') {
        //F: Flow Type
        worksheet.getCell('F' + index).value = 'Discharge'
        //G: Type
        worksheet.getCell('G' + index).value = meter.waterDischargeType;
      } else {
        //F: Flow Type
        worksheet.getCell('F' + index).value = 'Intake'
        //G: Type
        worksheet.getCell('G' + index).value = meter.waterIntakeType;
      }

      //H: Unit collection
      worksheet.getCell('H' + index).value = meter.startingUnit;
      //I: account #
      worksheet.getCell('I' + index).value = meter.accountNumber;
      //J: supplier
      worksheet.getCell('J' + index).value = meter.supplier;
      //K: Location
      worksheet.getCell('K' + index).value = meter.location;
      //L: Notes
      worksheet.getCell('L' + index).value = meter.notes;
      //Charges
      this.addChargesToWorksheet(worksheet, 'M', index, meter);
      index++;
    });
    return worksheet;
  }

  setWaterDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Water');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let waterMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    let index: number = 3;
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
        //add charges
        this.addChargeReadingsToWorksheet(worksheet, 'E', index, meter, dataReading);
        index++;
      })
    })
    return worksheet;
  }

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
      worksheet.getCell(alpha + rowIndex).value = mDataCharge.chargeUsage;
      alpha = this.getNextAlpha(alpha);
      worksheet.getCell(alpha + rowIndex).value = mDataCharge.chargeAmount;
      alpha = this.getNextAlpha(alpha);
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
  setPredictorsWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Predictor Setup');
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      facilities = facilities.filter(facility => { return facility.guid == facilityId });
    }
    let predictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    if (facilityId) {
      predictors = predictors.filter(predictor => { return predictor.facilityId == facilityId });
    }
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let index: number = 3;
    predictors.forEach(predictor => {
      let facilityName: string = accountFacilities.find(facility => { return facility.guid == predictor.facilityId }).name;
      //A: Facility name
      worksheet.getCell('A' + index).value = facilityName;
      //B: predictor name
      worksheet.getCell('B' + index).value = predictor.name;
      //C: calanderize readings?
      worksheet.getCell('C' + index).value = 'No';
      //D: is Production?
      worksheet.getCell('D' + index).value = predictor.production ? 'Yes' : 'No';
      //E: Units
      worksheet.getCell('E' + index).value = predictor.unit;
      //F: notes
      worksheet.getCell('F' + index).value = predictor.description;
      index++;
    });
    return worksheet;
  }

  setPredictorDataWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Predictors');
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      facilities = facilities.filter(facility => { return facility.guid == facilityId });
    }
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let rowIndex: number = 3;
    facilities.forEach(facility => {
      let facilityPredictorData: Array<IdbPredictorData> = accountPredictorData.filter(pData => { return pData.facilityId == facility.guid });
      let predictorDates: Array<{
        month: number,
        year: number
      }> = facilityPredictorData.flatMap(pData => {
        let pDate: Date = new Date(pData.date);
        return {
          month: pDate.getMonth(),
          year: pDate.getFullYear()
        }
      });
      predictorDates = _.uniqBy(predictorDates, (pDate: { month: number, year: number }) => {
        return pDate.month + '-' + pDate.year
      });
      predictorDates = _.orderBy(predictorDates, ['year', 'month']);
      let facilityPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
        return predictor.facilityId == facility.guid;
      });

      predictorDates.forEach(pDate => {
        worksheet.getCell('A' + rowIndex).value = facility.name;
        let date: Date = new Date(pDate.year, pDate.month, 1);
        worksheet.getCell('B' + rowIndex).value = this.getFormatedDate(date);
        let alpha: string = 'C';
        facilityPredictors.forEach(predictor => {
          worksheet.getCell(alpha + rowIndex).value = predictor.name;
          alpha = this.getNextAlpha(alpha);
          let reading: IdbPredictorData = facilityPredictorData.find(pData => {
            return checkSameMonth(new Date(pData.date), new Date(pDate.year, pDate.month, 1)) && pData.predictorId == predictor.guid;
          });
          if (reading) {
            worksheet.getCell(alpha + rowIndex).value = reading.amount;
          }
          alpha = this.getNextAlpha(alpha);
        });
        rowIndex++;
      });
    })

    return worksheet;
  }


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
    let month: string = (readingDate.getMonth() + 1).toString().padStart(2, '0');
    let day: string = (readingDate.getDate()).toString().padStart(2, '0');
    return readingDate.getFullYear() + '-' + month + '-' + day;
  }
}

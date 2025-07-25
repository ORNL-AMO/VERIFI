import { Injectable } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getNewIdbUtilityMeter, IdbUtilityMeter, MeterCharge, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData, MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { checkImportCellNumber, checkImportStartingUnit, checkSameDay, getAgreementType, getCountryCode, getFuelEnum, getMeterSource, getScope, getState, getYesNoBool, getZip, parseNAICs } from './upload-helper-functions';
import * as _ from 'lodash';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SubRegionData } from 'src/app/models/eGridEmissions';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { getGUID, getHeatingCapacity, getIsEnergyMeter, getIsEnergyUnit, getSiteToSource } from 'src/app/shared/sharedHelperFuntions';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';
import { ChargeCostUnit, MeterChargeType } from 'src/app/shared/shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getMeterDataCopy } from 'src/app/calculations/conversions/convertMeterData';
@Injectable({
  providedIn: 'root'
})
export class UploadDataV3Service {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private utilityMeterDbService: UtilityMeterdbService,
    private editMeterFormService: EditMeterFormService,
    private uploadDataSharedFunctionsService: UploadDataSharedFunctionsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let importFacilities: Array<IdbFacility> = this.getImportFacilities(workbook, selectedAccount);
    if (importFacilities.length == 0) {
      throw ('No Facilities Found!')
    } else {
      let meters: Array<IdbUtilityMeter> = [];
      let newGroups: Array<IdbUtilityMeterGroup> = [];
      ({ meters, newGroups } = this.getElectricityMeters(workbook, importFacilities, selectedAccount, meters, newGroups));
      ({ meters, newGroups } = this.getStationaryFuelMeters(workbook, importFacilities, selectedAccount, meters, newGroups));
      ({ meters, newGroups } = this.getMobileMeters(workbook, importFacilities, selectedAccount, meters, newGroups));
      ({ meters, newGroups } = this.getOtherEnergyMeters(workbook, importFacilities, selectedAccount, meters, newGroups));
      let importMeterData: Array<IdbUtilityMeterData> = this.getUtilityMeterData(workbook, meters);
      // let importPredictors: Array<IdbPredictor> = this.uploadDataSharedFunctionsService.getPredictors(workbook, importFacilities);
      // let importPredictorData: Array<IdbPredictorData> = this.uploadDataSharedFunctionsService.getPredictorData(workbook, importFacilities, importPredictors);
      let importPredictors: Array<IdbPredictor> = [];
      let importPredictorData: Array<IdbPredictorData> = [];

      return { importFacilities: importFacilities, importMeters: meters, predictors: importPredictors, predictorData: importPredictorData, meterData: importMeterData, newGroups: newGroups }
    }
  }

  getImportFacilities(workbook: XLSX.WorkBook, selectedAccount: IdbAccount): Array<IdbFacility> {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities'], { range: 1 });
    let importFacilities: Array<IdbFacility> = new Array();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();
    facilitiesData.forEach(facilityDataRow => {
      let facilityName: string = facilityDataRow['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = accountFacilities.find(facility => { return facility.name == facilityName });
        if (!facility) {
          facility = getNewIdbFacility(selectedAccount);
          facility.name = facilityName;
        }
        facility.address = facilityDataRow['Address'];
        facility.country = getCountryCode(facilityDataRow['Country']);
        facility.state = getState(facilityDataRow['US State']);
        facility.city = facilityDataRow['City'];
        facility.zip = getZip(facilityDataRow['ZIP Code']);
        facility.naics1 = parseNAICs(facilityDataRow['NAICS Code (2-digit)']);
        facility.naics2 = parseNAICs(facilityDataRow['NAICS Code (3-digit)']);
        facility.contactName = facilityDataRow['Contact Name'];
        facility.contactPhone = facilityDataRow['Contact Phone'];
        facility.contactEmail = facilityDataRow['Contact Email'];
        if (facility.zip && facility.zip.length == 5) {
          let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == facility.zip });
          if (subRegionData) {
            if (subRegionData.subregions.length != 0) {
              facility.eGridSubregion = subRegionData.subregions[0]
            }
          }
        }
        importFacilities.push(facility);
      }
    });
    return importFacilities;
  }


  getElectricityMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount, meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup>): { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity Meters'], { range: 1 });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    excelMeters.forEach(excelMeter => {
      let facilityName: string = excelMeter['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = excelMeter['Meter Number (UNIQUE)'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }

          meter.meterNumber = meterNumber;
          meter.accountNumber = excelMeter['Account #'];
          meter.source = 'Electricity';
          meter.scope = 3;
          meter.name = excelMeter['Meter Name (DISPLAY)'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = excelMeter['Supplier'];
          meter.notes = excelMeter['Notes'];
          meter.location = excelMeter['Location'];
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group (ANALYSIS)'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }

          //parse electricity
          meter.startingUnit = checkImportStartingUnit(excelMeter['Unit (USAGE)'], meter.source, meter.phase, meter.fuel, meter.scope);
          if (meter.startingUnit) {
            meter.energyUnit = meter.startingUnit;
          } else {
            meter.startingUnit = facility.energyUnit;
            meter.energyUnit = facility.energyUnit;
          }

          meter.agreementType = getAgreementType(excelMeter['Agreement Type']);
          if (meter.agreementType == undefined) {
            meter.agreementType = 1;
          }
          if (meter.agreementType != 4 && meter.agreementType != 6) {
            meter.includeInEnergy = true;
          } else {
            meter.includeInEnergy = false;
          }
          meter.retainRECs = getYesNoBool(excelMeter['Retain RECs?']);
          if (meter.retainRECs == undefined) {
            if (meter.agreementType == 1) {
              meter.retainRECs = false;
            } else {
              meter.retainRECs = true;
            }
          }

          if (meter.agreementType == 1) {
            //grid
            meter.includeInEnergy = true;
            meter.retainRECs = false;
          } else if (meter.agreementType == 4 || meter.agreementType == 6) {
            //VPPA || RECs
            meter.includeInEnergy = false;
          } else if (meter.agreementType == 5) {
            //Utility green product
            meter.includeInEnergy = true;
          }

          if (!meter.includeInEnergy) {
            meter.siteToSource = 1;
          } else {
            meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          }

          if (meter.agreementType == 2) {
            meter.directConnection = true;
          }

          meter.meterReadingDataApplication = this.getMeterReadingDataApplication(excelMeter['Calendarize Readings?']);
          meter = this.editMeterFormService.setMultipliers(meter);

          this.addCharges(excelMeter, meter);
          meters.push(meter);
        }
      }
    })
    return { meters: meters, newGroups: newGroups };
  }

  getStationaryFuelMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount, meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup>): { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Stationary Fuel Meters'], { range: 1 });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    excelMeters.forEach(excelMeter => {
      let facilityName: string = excelMeter['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = excelMeter['Meter Number (UNIQUE)'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }

          meter.meterNumber = meterNumber;
          meter.accountNumber = excelMeter['Account #'];

          meter.scope = 1;
          let fuel: string = excelMeter['Fuel'];
          if (fuel == 'Natural Gas') {
            meter.source = 'Natural Gas';
          } else {
            meter.source = 'Other Fuels';
          }
          meter.phase = excelMeter['Phase']
          meter.fuel = getFuelEnum(fuel, meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType)

          meter.startingUnit = checkImportStartingUnit(excelMeter['Unit (COLLECTION)'], meter.source, meter.phase, meter.fuel, meter.scope);
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (isEnergyUnit) {
            meter.energyUnit = meter.startingUnit;
          } else if (excelMeter['Unit (ENERGY)']) {
            meter.energyUnit = excelMeter['Unit (ENERGY)'];
          } else {
            meter.energyUnit = facility.energyUnit;
          }
          meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);

          meter.name = excelMeter['Meter Name (DISPLAY)'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = excelMeter['Supplier'];
          meter.notes = excelMeter['Notes'];
          meter.location = excelMeter['Location'];
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group (ANALYSIS)'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }
          if (excelMeter['Energy Unit']) {
            meter.energyUnit = excelMeter['Energy Unit'];
          } else {
            meter.energyUnit = facility.energyUnit;
          }
          meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, false);
          meter.meterReadingDataApplication = this.getMeterReadingDataApplication(excelMeter['Calendarize Readings?']);
          meter = this.editMeterFormService.setMultipliers(meter);
          this.addCharges(excelMeter, meter);
          meters.push(meter);
        }
      }
    });
    return { meters: meters, newGroups: newGroups };
  }

  getMobileMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount, meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup>): { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Mobile Fuel Meters'], { range: 1 });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    excelMeters.forEach(excelMeter => {
      let facilityName: string = excelMeter['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = excelMeter['Meter Number (UNIQUE)'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }
          meter.source = 'Other Fuels';
          meter.scope = 2;
          meter.meterNumber = meterNumber;
          meter.accountNumber = excelMeter['Account #'];
          meter.name = excelMeter['Meter Name (DISPLAY)'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = excelMeter['Supplier'];
          meter.notes = excelMeter['Notes'];
          meter.location = excelMeter['Location'];

          let parseVehicle: {
            vehicleCategory: number, vehicleType: number,
            vehicleCollectionType: number, vehicleCollectionUnit: string, vehicleDistanceUnit: string
          } = this.getVehicleTypeAndCategory(excelMeter);
          meter.vehicleCategory = parseVehicle.vehicleCategory;
          meter.vehicleType = parseVehicle.vehicleType;
          meter.vehicleCollectionType = parseVehicle.vehicleCollectionType;
          meter.vehicleCollectionUnit = parseVehicle.vehicleCollectionUnit;
          meter.vehicleDistanceUnit = parseVehicle.vehicleDistanceUnit;

          meter.vehicleFuel = getFuelEnum(excelMeter['Fuel Type'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);

          meter.vehicleFuelEfficiency = excelMeter['Average Fuel Efficiency'];
          meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, false);
          meter.includeInEnergy = getYesNoBool(excelMeter['Include with Energy?']);

          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group (ANALYSIS)'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }
          meter.meterReadingDataApplication = this.getMeterReadingDataApplication(excelMeter['Calendarize Readings?']);
          meter = this.editMeterFormService.setMultipliers(meter);
          this.addCharges(excelMeter, meter);
          meters.push(meter);
        }
      }
    })
    return { meters: meters, newGroups: newGroups };
  }

  getOtherEnergyMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount, meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup>): { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Other Energy Meters'], { range: 1 });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    excelMeters.forEach(excelMeter => {
      let facilityName: string = excelMeter['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = excelMeter['Meter Number (UNIQUE)'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }
          meter.source = 'Other Energy';
          meter.scope = 1;
          meter.meterNumber = meterNumber;
          meter.accountNumber = excelMeter['Account #'];
          meter.name = excelMeter['Meter Name (DISPLAY)'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = excelMeter['Supplier'];
          meter.notes = excelMeter['Notes'];
          meter.location = excelMeter['Location'];

          let fuel: string = excelMeter['Type'];
          meter.fuel = getFuelEnum(fuel, meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType)

          meter.startingUnit = checkImportStartingUnit(excelMeter['Unit (COLLECTION)'], meter.source, meter.phase, meter.fuel, meter.scope);
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (isEnergyUnit) {
            meter.energyUnit = meter.startingUnit;
          } else if (excelMeter['Unit (ENERGY)']) {
            meter.energyUnit = excelMeter['Unit (ENERGY)'];
          } else {
            meter.energyUnit = facility.energyUnit;
          }
          meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);

          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group (ANALYSIS)'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }
          meter.meterReadingDataApplication = this.getMeterReadingDataApplication(excelMeter['Calendarize Readings?']);
          meter = this.editMeterFormService.setMultipliers(meter);
          this.addCharges(excelMeter, meter);
          meters.push(meter);
        }
      }
    })
    return { meters: meters, newGroups: newGroups };
  }

  getUtilityMeterData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let utilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.map(meterData => { return getMeterDataCopy(meterData) });
    importMeterData = this.getElectricityData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getStationaryFuelData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getMobileData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getOtherEnergyData(workbook, importMeters, importMeterData, utilityMeterData);
    return importMeterData;
  }

  getElectricityData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    //electricity readings
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity'], { range: 1 });

    electricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDateStr: string = dataPoint['Read Date'];
      let totalUsage: number = checkImportCellNumber(dataPoint['Total Usage']);
      if (meterNumber && readDateStr && isNaN(totalUsage) == false) {
        let readDate: Date = new Date(readDateStr);
        let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
        if (meter) {
          let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
          if (!dbDataPoint) {
            dbDataPoint = getNewIdbUtilityMeterData(meter, []);
          }
          dbDataPoint.readDate = readDate;
          dbDataPoint.totalEnergyUse = totalUsage;
          dbDataPoint.totalRealDemand = checkImportCellNumber(dataPoint['Actual Demand']);
          dbDataPoint.totalBilledDemand = checkImportCellNumber(dataPoint['Total Billed Demand']);
          dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost ($)']);
          dbDataPoint.powerFactor = checkImportCellNumber(dataPoint['Power Factor']);
          this.addMeterDataCharges(dataPoint, dbDataPoint, meter);
          importMeterData.push(dbDataPoint);
        }
      }
    });
    return importMeterData;
  }

  getStationaryFuelData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    //stationary readings
    let stationaryData = XLSX.utils.sheet_to_json(workbook.Sheets['Stationary Fuel'], { range: 1 });
    stationaryData.forEach(dataPoint => {

      let meterNumber: string = dataPoint['Meter Number'];
      let readDateStr: string = dataPoint['Read Date'];
      let totalUsage: number = checkImportCellNumber(dataPoint['Total Usage']);
      if (meterNumber && readDateStr && isNaN(totalUsage) == false) {
        let readDate: Date = new Date(readDateStr);
        let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
        if (meter) {
          let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
          if (!dbDataPoint) {
            dbDataPoint = getNewIdbUtilityMeterData(meter, []);
          }
          dbDataPoint.readDate = readDate;
          dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost ($)']);
          let hhv: number = checkImportCellNumber(dataPoint['Higher Heating Value']);
          let totalVolume: number = 0;
          let energyUse: number = 0;
          if (hhv) {
            dbDataPoint.heatCapacity = hhv;
          } else {
            dbDataPoint.heatCapacity = meter.heatCapacity;
          }
          let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
          let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
          if (!displayVolumeInput) {
            energyUse = totalUsage;
          } else {
            totalVolume = totalUsage;
            if (displayEnergyUse && totalVolume) {
              energyUse = totalVolume * dbDataPoint.heatCapacity;
            }
          }
          dbDataPoint.totalVolume = totalVolume;
          dbDataPoint.totalEnergyUse = energyUse;
          this.addMeterDataCharges(dataPoint, dbDataPoint, meter);
          importMeterData.push(dbDataPoint);
        }
      }
    });
    return importMeterData;
  }

  getMobileData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    //stationary readings
    let stationaryData = XLSX.utils.sheet_to_json(workbook.Sheets['Mobile Fuel'], { range: 1 });
    stationaryData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDateStr: string = dataPoint['Read Date'];
      let totalUsage: number = checkImportCellNumber(dataPoint['Total Usage or Distance']);
      if (meterNumber && readDateStr && isNaN(totalUsage) == false) {
        let readDate: Date = new Date(readDateStr);
        let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
        if (meter) {
          let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
          if (!dbDataPoint) {
            dbDataPoint = getNewIdbUtilityMeterData(meter, []);
          }
          dbDataPoint.readDate = readDate;
          let fuelEff: number = checkImportCellNumber(dataPoint['Fuel Efficiency']);
          if (fuelEff) {
            dbDataPoint.vehicleFuelEfficiency = fuelEff;
          } else {
            dbDataPoint.vehicleFuelEfficiency = meter.vehicleFuelEfficiency;
          }
          dbDataPoint.totalVolume = totalUsage;
          //1: Fuel Usage, 2: Mileage
          if (meter.vehicleCollectionType == 1) {
            dbDataPoint.totalEnergyUse = dbDataPoint.totalVolume * meter.heatCapacity
          } else {
            let fuelConsumption: number = dbDataPoint.totalVolume / dbDataPoint.vehicleFuelEfficiency;
            dbDataPoint.totalEnergyUse = fuelConsumption * meter.heatCapacity;
          }
          dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost ($)']);
          this.addMeterDataCharges(dataPoint, dbDataPoint, meter);
          importMeterData.push(dbDataPoint);
        }
      }
    });
    return importMeterData;
  }

  getOtherEnergyData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    //stationary readings
    let stationaryData = XLSX.utils.sheet_to_json(workbook.Sheets['Other Energy'], { range: 1 });
    stationaryData.forEach(dataPoint => {

      let meterNumber: string = dataPoint['Meter Number'];
      let readDateStr: string = dataPoint['Read Date'];
      let totalUsage: number = checkImportCellNumber(dataPoint['Total Usage']);
      if (meterNumber && readDateStr && isNaN(totalUsage) == false) {
        let readDate: Date = new Date(readDateStr);
        let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
        if (meter) {
          let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
          if (!dbDataPoint) {
            dbDataPoint = getNewIdbUtilityMeterData(meter, []);
          }
          dbDataPoint.readDate = readDate;
          dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost ($)']);
          let hhv: number = checkImportCellNumber(dataPoint['Energy Factor']);
          let totalVolume: number = 0;
          let energyUse: number = 0;
          if (hhv) {
            dbDataPoint.heatCapacity = hhv;
          } else {
            dbDataPoint.heatCapacity = meter.heatCapacity;
          }
          let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
          let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
          if (!displayVolumeInput) {
            energyUse = totalUsage;
          } else {
            totalVolume = totalUsage;
            if (displayEnergyUse && totalVolume) {
              energyUse = totalVolume * dbDataPoint.heatCapacity;
            }
          }
          dbDataPoint.totalVolume = totalVolume;
          dbDataPoint.totalEnergyUse = energyUse;
          this.addMeterDataCharges(dataPoint, dbDataPoint, meter);
          importMeterData.push(dbDataPoint);
        }
      }
    });
    return importMeterData;
  }

  addMeterDataCharges(dataPoint, dbDataPoint: IdbUtilityMeterData, meter: IdbUtilityMeter) {
    for (let i = 0; i < 16; i++) {
      if (dataPoint['Charge ' + i + ' Name']) {
        let chargeName: string = dataPoint['Charge ' + i + ' Name'];
        let meterCharge: MeterCharge = meter.charges.find(charge => {
          return charge.name == chargeName
        });
        if (meterCharge) {
          let meterDataCharge: MeterDataCharge = dbDataPoint.charges.find(charge => {
            return charge.chargeGuid == meterCharge.guid
          });
          if (meterDataCharge) {
            meterDataCharge.chargeAmount = checkImportCellNumber(dataPoint['Charge ' + i + ' Cost']);
            meterDataCharge.chargeUsage = checkImportCellNumber(dataPoint['Charge ' + i + ' Reading']);
          } else {
            dbDataPoint.charges.push({
              chargeGuid: meterCharge.guid,
              chargeAmount: checkImportCellNumber(dataPoint['Charge ' + i + ' Cost']),
              chargeUsage: checkImportCellNumber(dataPoint['Charge ' + i + ' Reading'])

            })
          }
        }
      }
    }
  }


  addCharges(excelMeter, meter: IdbUtilityMeter) {
    //TODO: Need charge types and units for stationary fuels
    for (let i = 1; i < 16; i++) {
      if (excelMeter['Charge ' + i + ' Name']) {
        let chargeName: string = excelMeter['Cost ' + i + ' Name'];
        let charge: MeterCharge = meter.charges.find(charge => {
          return charge.name == chargeName
        });
        if (charge) {
          charge.name = excelMeter['Charge ' + i + ' Name'];
          charge.chargeType = this.getChargeType(excelMeter['Cost ' + i + ' Type']);
        } else {
          charge = {
            guid: getGUID(),
            name: excelMeter['Charge ' + i + ' Name'],
            chargeType: this.getChargeType(excelMeter['Charge ' + i + ' Type']),
            displayChargeInTable: true,
            displayUsageInTable: true
          }
          meter.charges.push(charge);
        }
      }
    }
  }

  getChargeType(excelChargeType: string): MeterChargeType {
    if (excelChargeType) {
      if (excelChargeType == 'Consumption') {
        return 'consumption'
      } else if (excelChargeType == 'Demand') {
        return 'demand'
      } else if (excelChargeType == 'Tax') {
        return 'tax';
      } else if (excelChargeType == 'Late Fee') {
        return 'lateFee';
      } else if (excelChargeType == 'Flat Fee') {
        return 'flatFee';
      } else if (excelChargeType == 'Other') {
        return 'other';
      } else if (excelChargeType == 'Usage') {
        return 'usage';
      } else if (excelChargeType == 'Demand/MDQ') {
        return 'demandMDQ';
      }
    }
    return undefined;
  }

  setMeterUnits(excelMeter, meter: IdbUtilityMeter, facility: IdbFacility) {
    meter.startingUnit = checkImportStartingUnit(excelMeter['Unit (USAGE)'], meter.source, meter.phase, meter.fuel, meter.scope);
    let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
    if (isEnergyUnit) {
      meter.energyUnit = meter.startingUnit;
    } else if (excelMeter['Energy Unit']) {
      meter.energyUnit = excelMeter['Energy Unit'];
    } else {
      meter.energyUnit = facility.energyUnit;
    }
  }

  parseSiteToSource(excelMeter: any, meter: IdbUtilityMeter): number {
    let siteToSource: number = excelMeter['S2S Factor'];
    if (siteToSource == undefined) {
      let selectedFuelTypeOption: FuelTypeOption;
      if (meter.fuel != undefined) {
        let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(meter.source, meter.phase, [], meter.scope, meter.vehicleCategory, meter.vehicleType);
        selectedFuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
      }
      siteToSource = getSiteToSource(meter.source, selectedFuelTypeOption, meter.agreementType);
    }
    return siteToSource;
  }

  getMeterReadingDataApplication(excelSelection: 'Yes' | 'No' | 'Evenly Distribute'): MeterReadingDataApplication {
    if (excelSelection == 'Yes') {
      return 'backward';
    } else if (excelSelection == 'No') {
      return 'fullMonth';
    } else if (excelSelection == 'Evenly Distribute') {
      return 'fullYear';
    };
  }


  getExistingDbEntry(utilityMeterData: Array<IdbUtilityMeterData>, meter: IdbUtilityMeter, readDate: Date): IdbUtilityMeterData {
    return utilityMeterData.find(meterDataItem => {
      if (meterDataItem.meterId == meter.guid) {
        let dateItemDate: Date = new Date(meterDataItem.readDate);
        return checkSameDay(dateItemDate, readDate);
      } else {
        return false;
      }
    })
  }

  parseHeatCapacity(excelMeter: any, meter: IdbUtilityMeter, isEnergyUnit: boolean): number {
    let heatCapacity: number = excelMeter['Energy Factor'];
    if ((!heatCapacity && !isEnergyUnit) || meter.scope == 2) {
      let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(meter.source, meter.phase, [], meter.scope, meter.vehicleCategory, meter.vehicleType);
      if (meter.scope != 2) {
        let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
        heatCapacity = getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit, fuel);
      } else {
        let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.vehicleFuel });
        heatCapacity = getHeatingCapacity(meter.source, meter.vehicleCollectionUnit, meter.energyUnit, fuel);
      }
    }
    return heatCapacity
  }

  getVehicleTypeAndCategory(excelMeter): {
    vehicleCategory: number, vehicleType: number,
    vehicleCollectionType: number, vehicleCollectionUnit: string, vehicleDistanceUnit: string
  } {
    let vehicle = excelMeter['Vehicle Type']
    let vehicleCategory: number;
    let vehicleType: number;
    let vehicleCollectionType: number;
    let vehicleCollectionUnit: string;
    let vehicleDistanceUnit: string;

    if (vehicle == 'Material Transport Onsite') {
      vehicleCategory = 1;
    } else if (vehicle == 'On-Road Vehicle, Passenger Cars') {
      vehicleCategory = 2;
      vehicleType = 1;
    } else if (vehicle == 'On-Road Vehicle, Light-Duty Trucks') {
      vehicleCategory = 2;
      vehicleType = 2;
    } else if (vehicle == 'On-Road Vehicle, Bus') {
      vehicleCategory = 2;
      vehicleType = 3;
    } else if (vehicle == 'On-Road Vehicle, Heavy-Duty Trucks') {
      vehicleCategory = 2;
      vehicleType = 4;
    } else if (vehicle == 'On-Road Vehicle, Motorcycles') {
      vehicleCategory = 2;
      vehicleType = 5;
    } else if (vehicle == 'Off-Road Vehicle, Ag. Equipment & Trucks') {
      vehicleCategory = 3;
      vehicleType = 6;
    } else if (vehicle == 'Off-Road Vehicle, Construction/Mine Equipment & Trucks') {
      vehicleCategory = 3;
      vehicleType = 7;
    } else if (vehicle == 'Non-Road Vehicle, Aircraft') {
      vehicleCategory = 4;
      vehicleType = 8;
    } else if (vehicle == 'Non-Road Vehicle, Rail') {
      vehicleCategory = 4;
      vehicleType = 9;
    } else if (vehicle == 'Non-Road Vehicle, Water Transport') {
      vehicleCategory = 4;
      vehicleType = 10;
    }
    //on-road
    if (vehicleCategory == 2) {
      vehicleCollectionType = this.getVehicleCollectionType(excelMeter['Estimation Method']);
    } else {
      vehicleCollectionType = 1;
    }

    vehicleDistanceUnit = excelMeter['Unit (DISTANCE)'];
    vehicleCollectionUnit = excelMeter['Unit (USAGE)'];
    return {
      vehicleCategory: vehicleCategory,
      vehicleType: vehicleType,
      vehicleCollectionType: vehicleCollectionType,
      vehicleCollectionUnit: vehicleCollectionUnit,
      vehicleDistanceUnit: vehicleDistanceUnit
    }
  }

  getVehicleCollectionType(collectionLabel: string): number {
    if (collectionLabel == 'Fuel') {
      return 1;
    } else if (collectionLabel == 'Mileage') {
      return 2;
    }
    return 1;
  }
}

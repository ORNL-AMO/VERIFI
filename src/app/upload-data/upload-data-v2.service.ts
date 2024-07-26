import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup, MeterReadingDataApplication } from '../models/idb';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import * as _ from 'lodash';
import { checkImportCellNumber, checkImportStartingUnit, checkSameDay, getAgreementType, getCountryCode, getFuelEnum, getMeterSource, getPhase, getScope, getState, getYesNoBool, getZip } from './upload-helper-functions';
import { EGridService } from '../shared/helper-services/e-grid.service';
import { SubRegionData } from '../models/eGridEmissions';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { FuelTypeOption } from '../shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from '../shared/fuel-options/getFuelTypeOptions';
import { getHeatingCapacity, getIsEnergyMeter, getIsEnergyUnit, getSiteToSource } from '../shared/sharedHelperFuntions';
import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { getMeterDataCopy } from '../calculations/conversions/convertMeterData';
import { ConvertValue } from '../calculations/conversions/convertValue';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from '../models/globalWarmingPotentials';
import { SetupWizardService } from '../setup-wizard/setup-wizard.service';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '../models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class UploadDataV2Service {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private utilityMeterDbService: UtilityMeterdbService,
    private uploadDataSharedFunctionsService: UploadDataSharedFunctionsService,
    private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private setupWizardService: SetupWizardService) { }


  parseTemplate(workbook: XLSX.WorkBook, inSetupWizard: boolean): ParsedTemplate {
    let selectedAccount: IdbAccount;
    if (inSetupWizard) {
      selectedAccount = this.setupWizardService.account.getValue();
    } else {
      selectedAccount = this.accountDbService.selectedAccount.getValue();
    }
    let importFacilities: Array<IdbFacility> = this.getImportFacilities(workbook, selectedAccount);
    if (importFacilities.length == 0) {
      throw ('No Facilities Found!')
    } else {
      let importMetersAndGroups: { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } = this.getImportMeters(workbook, importFacilities, selectedAccount);
      let predictorEntries: Array<IdbPredictorEntry> = this.uploadDataSharedFunctionsService.getPredictorData(workbook, importFacilities, selectedAccount);
      let importMeterData: Array<IdbUtilityMeterData> = this.getUtilityMeterData(workbook, importMetersAndGroups.meters);
      return { importFacilities: importFacilities, importMeters: importMetersAndGroups.meters, predictorEntries: predictorEntries, meterData: importMeterData, newGroups: importMetersAndGroups.newGroups }
    }
  }

  getImportFacilities(workbook: XLSX.WorkBook, selectedAccount: IdbAccount): Array<IdbFacility> {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities']);
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
        facility.state = getState(facilityDataRow['State']);
        facility.city = facilityDataRow['City'];
        facility.zip = getZip(facilityDataRow['Zip']);
        facility.naics2 = facilityDataRow['NAICS Code 2 digit'];
        facility.naics3 = facilityDataRow['NAICS Code 3 digit'];
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

  getImportMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount): { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Meters-Utilities']);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    let importMeters: Array<IdbUtilityMeter> = new Array();
    let newGroups: Array<IdbUtilityMeterGroup> = new Array();
    excelMeters.forEach(excelMeter => {
      let facilityName: string = excelMeter['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = excelMeter['Meter Number (unique)'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = this.utilityMeterDbService.getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }

          meter.meterNumber = meterNumber;
          meter.accountNumber = excelMeter['Account Number'];
          meter.source = getMeterSource(excelMeter['Source']);
          meter.scope = getScope(excelMeter['Scope']);
          if (meter.scope == undefined) {
            meter.scope = this.editMeterFormService.getDefaultScope(meter.source);
          }

          meter.name = excelMeter['Meter Name (Display)'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = excelMeter['Utility Supplier'];
          meter.notes = excelMeter['Notes'];
          meter.location = excelMeter['Building / Location'];
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }

          if (meter.source == 'Electricity') {
            //parse electricity
            this.setMeterUnits(excelMeter, meter, facility);
            meter.agreementType = getAgreementType(excelMeter['Agreement Type']);
            if (meter.agreementType == undefined) {
              meter.agreementType = 1;
            }
            meter.includeInEnergy = getYesNoBool(excelMeter['Include In Energy']);
            if (meter.includeInEnergy == undefined) {
              if (meter.agreementType != 4 && meter.agreementType != 6) {
                meter.includeInEnergy = true;
              } else {
                meter.includeInEnergy = false;
              }
            }
            meter.retainRECs = getYesNoBool(excelMeter['Retain RECS']);
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
          } else if (meter.source == 'Natural Gas') {
            //pares NG
            meter.phase = 'Gas';
            this.setMeterUnits(excelMeter, meter, facility);
            let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
            meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          } else if (meter.source == 'Other Fuels') {
            if (meter.scope != 2) {
              //parse stationary if not vehicle
              meter.phase = getPhase(excelMeter['Phase or Vehicle']);
              meter.fuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
              this.setMeterUnits(excelMeter, meter, facility);
              let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
              meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            } else if (meter.scope == 2) {
              meter.phase = 'Liquid';
              let vehicleData = this.parseVehicleData(excelMeter);
              meter.vehicleCategory = vehicleData.vehicleCategory;
              meter.vehicleType = vehicleData.vehicleType;
              meter.vehicleCollectionType = vehicleData.vehicleCollectionType;
              meter.vehicleCollectionUnit = vehicleData.vehicleCollectionUnit;
              meter.vehicleDistanceUnit = vehicleData.vehicleDistanceUnit;
              meter.vehicleFuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
              meter.vehicleFuelEfficiency = excelMeter['Heat Capacity or Fuel Efficiency'];
              if (excelMeter['Energy Unit']) {
                meter.energyUnit = excelMeter['Energy Unit'];
              } else {
                meter.energyUnit = facility.energyUnit;
              }
              meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, false);
            }
          } else if (meter.source == 'Other Energy') {
            //parse other energy
            meter.fuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
            this.setMeterUnits(excelMeter, meter, facility);
            let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
            meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          } else if (meter.source == 'Water Discharge') {
            //parse water discharge
            meter.waterDischargeType = excelMeter['Fuel or Emission'];
            meter.includeInEnergy = false;
            this.setMeterUnits(excelMeter, meter, facility);
          } else if (meter.source == 'Water Intake') {
            //parse water intake
            meter.waterIntakeType = excelMeter['Fuel or Emission'];
            meter.includeInEnergy = false;
            this.setMeterUnits(excelMeter, meter, facility);
          } else if (meter.source == 'Other') {
            //parse other
            this.setMeterUnits(excelMeter, meter, facility);
            if (meter.scope == 5 || meter.scope == 6) {
              let parseGWPData = this.parseGlobalWarmingPotentials(excelMeter, meter.startingUnit);
              meter.globalWarmingPotential = parseGWPData.globalWarmingPotential;
              meter.globalWarmingPotentialOption = parseGWPData.globalWarmingPotentialOption;
            }
          }

          meter.meterReadingDataApplication = this.getMeterReadingDataApplicationV2(excelMeter['Calendarize Data?']);
          meter = this.editMeterFormService.setMultipliers(meter);
          importMeters.push(meter);
        }
      }
    })
    return { meters: importMeters, newGroups: newGroups };
  }

  setMeterUnits(excelMeter, meter: IdbUtilityMeter, facility: IdbFacility) {
    meter.startingUnit = checkImportStartingUnit(excelMeter['Collection Unit'], meter.source, meter.phase, meter.fuel, meter.scope);
    let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
    if (isEnergyUnit) {
      meter.energyUnit = meter.startingUnit;
    } else if (excelMeter['Energy Unit']) {
      meter.energyUnit = excelMeter['Energy Unit'];
    } else {
      meter.energyUnit = facility.energyUnit;
    }
  }

  getUtilityMeterData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let utilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.map(meterData => { return getMeterDataCopy(meterData) });
    importMeterData = this.getElectricityData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getStationaryOtherEnergyData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getMobileFuelData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getWaterData(workbook, importMeters, importMeterData, utilityMeterData);
    importMeterData = this.getOtherUtilityEmissionsData(workbook, importMeters, importMeterData, utilityMeterData);

    return importMeterData;
  }

  getElectricityData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    //electricity readings
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity']);

    electricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalEnergyUse = checkImportCellNumber(dataPoint['Total Consumption']);
        dbDataPoint.totalRealDemand = checkImportCellNumber(dataPoint['Total Real Demand']);
        dbDataPoint.totalBilledDemand = checkImportCellNumber(dataPoint['Total Billed Demand']);
        dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.nonEnergyCharge = checkImportCellNumber(dataPoint['Non-energy Charge']);
        dbDataPoint.block1Consumption = checkImportCellNumber(dataPoint['Block 1 Consumption']);
        dbDataPoint.block1ConsumptionCharge = checkImportCellNumber(dataPoint['Block 1 Consumption Charge']);
        dbDataPoint.block2Consumption = checkImportCellNumber(dataPoint['Block 2 Consumption']);
        dbDataPoint.block2ConsumptionCharge = checkImportCellNumber(dataPoint['Block 2 Consumption Charge']);
        dbDataPoint.block3Consumption = checkImportCellNumber(dataPoint['Block 3 Consumption']);
        dbDataPoint.block3ConsumptionCharge = checkImportCellNumber(dataPoint['Block 3 Consumption Charge']);
        dbDataPoint.otherConsumption = checkImportCellNumber(dataPoint['Other Consumption']);
        dbDataPoint.otherConsumptionCharge = checkImportCellNumber(dataPoint['Other Consumption Charge']);
        dbDataPoint.onPeakAmount = checkImportCellNumber(dataPoint['On Peak Amount']);
        dbDataPoint.onPeakCharge = checkImportCellNumber(dataPoint['On Peak Charge']);
        dbDataPoint.offPeakAmount = checkImportCellNumber(dataPoint['Off Peak Amount']);
        dbDataPoint.offPeakCharge = checkImportCellNumber(dataPoint['Off Peak Charge']);
        dbDataPoint.transmissionAndDeliveryCharge = checkImportCellNumber(dataPoint['Transmission & Delivery Charge']);
        dbDataPoint.powerFactor = checkImportCellNumber(dataPoint['Power Factor']);
        dbDataPoint.powerFactorCharge = checkImportCellNumber(dataPoint['Power Factor Charge']);
        dbDataPoint.localSalesTax = checkImportCellNumber(dataPoint['Local Sales Tax']);
        dbDataPoint.stateSalesTax = checkImportCellNumber(dataPoint['State Sales Tax']);
        dbDataPoint.latePayment = checkImportCellNumber(dataPoint['Late Payment']);
        dbDataPoint.otherCharge = checkImportCellNumber(dataPoint['Other Charge']);
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  getStationaryOtherEnergyData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let excelData = XLSX.utils.sheet_to_json(workbook.Sheets['Stationary Fuel - Other Energy']);
    excelData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        let totalVolume: number = 0;
        let energyUse: number = 0;
        let totalConsumption: number = checkImportCellNumber(dataPoint['Total Consumption']);
        let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
        let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
        let hhv: number = checkImportCellNumber(dataPoint['Higher Heating Value']);
        if (hhv) {
          dbDataPoint.heatCapacity = hhv;
        } else {
          dbDataPoint.heatCapacity = meter.heatCapacity;
        }
        if (!displayVolumeInput) {
          energyUse = totalConsumption;
        } else {
          totalVolume = totalConsumption;
          if (displayEnergyUse && totalVolume) {
            energyUse = totalVolume * dbDataPoint.heatCapacity;
          }
        }

        dbDataPoint.readDate = readDate;
        dbDataPoint.totalVolume = totalVolume;
        dbDataPoint.totalEnergyUse = energyUse;
        dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.commodityCharge = checkImportCellNumber(dataPoint['Commodity Charge']);
        dbDataPoint.deliveryCharge = checkImportCellNumber(dataPoint['Delivery Charge']);
        dbDataPoint.otherCharge = checkImportCellNumber(dataPoint['Other Charge']);
        dbDataPoint.demandUsage = checkImportCellNumber(dataPoint['Demand Usage']);
        dbDataPoint.demandCharge = checkImportCellNumber(dataPoint['Demand Charge']);
        dbDataPoint.localSalesTax = checkImportCellNumber(dataPoint['Local Sales Tax']);
        dbDataPoint.stateSalesTax = checkImportCellNumber(dataPoint['State Sales Tax']);
        dbDataPoint.latePayment = checkImportCellNumber(dataPoint['Late Payment']);
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  getMobileFuelData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let excelData = XLSX.utils.sheet_to_json(workbook.Sheets['Mobile Fuel']);
    excelData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalVolume = dataPoint['Total Consumption or Total Distance'];
        let fuelEff: number = checkImportCellNumber(dataPoint['Fuel Efficiency']);
        if (fuelEff) {
          dbDataPoint.vehicleFuelEfficiency = fuelEff;
        } else {
          dbDataPoint.vehicleFuelEfficiency = meter.vehicleFuelEfficiency;
        }
        //1: Fuel Usage, 2: Mileage
        if (meter.vehicleCollectionType == 1) {
          dbDataPoint.totalEnergyUse = dbDataPoint.totalVolume * meter.heatCapacity
        } else {
          let fuelConsumption: number = dbDataPoint.totalVolume / dbDataPoint.vehicleFuelEfficiency;
          dbDataPoint.totalEnergyUse = fuelConsumption * meter.heatCapacity;
        }
        dbDataPoint.totalCost = dataPoint['Total Cost'];
        dbDataPoint.otherCharge = dataPoint['Other Charge'];
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });

    return importMeterData;
  }

  getWaterData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let excelData = XLSX.utils.sheet_to_json(workbook.Sheets['Water']);
    excelData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalVolume = dataPoint['Total Consumption'];
        dbDataPoint.totalEnergyUse = 0;
        dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.commodityCharge = checkImportCellNumber(dataPoint['Commodity Charge']);
        dbDataPoint.deliveryCharge = checkImportCellNumber(dataPoint['Delivery Charge']);
        dbDataPoint.otherCharge = checkImportCellNumber(dataPoint['Other Charge']);
        dbDataPoint.demandUsage = checkImportCellNumber(dataPoint['Demand Usage']);
        dbDataPoint.demandCharge = checkImportCellNumber(dataPoint['Demand Charge']);
        dbDataPoint.localSalesTax = checkImportCellNumber(dataPoint['Local Sales Tax']);
        dbDataPoint.stateSalesTax = checkImportCellNumber(dataPoint['State Sales Tax']);
        dbDataPoint.latePayment = checkImportCellNumber(dataPoint['Late Payment']);
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  getOtherUtilityEmissionsData(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>, importMeterData: Array<IdbUtilityMeterData>, utilityMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let excelData = XLSX.utils.sheet_to_json(workbook.Sheets['Other Utility - Emission']);
    excelData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = this.getExistingDbEntry(utilityMeterData, meter, readDate);
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalVolume = dataPoint['Total Consumption'];
        dbDataPoint.totalEnergyUse = 0;
        dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.otherCharge = checkImportCellNumber(dataPoint['Other Charge']);
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  parseHeatCapacity(excelMeter: any, meter: IdbUtilityMeter, isEnergyUnit: boolean): number {
    let heatCapacity: number = excelMeter['Heat Capacity or Fuel Efficiency'];
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

  parseSiteToSource(excelMeter: any, meter: IdbUtilityMeter): number {
    let siteToSource: number = excelMeter['Site To Source'];
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

  parseVehicleData(excelMeter: any): {
    vehicleCategory: number, vehicleType: number,
    vehicleCollectionType: number, vehicleCollectionUnit: string, vehicleDistanceUnit: string
  } {
    let vehicle: string = excelMeter['Phase or Vehicle'];
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

    vehicleDistanceUnit = excelMeter['Distance Unit'];
    vehicleCollectionUnit = excelMeter['Collection Unit'];
    return {
      vehicleCategory: vehicleCategory,
      vehicleType: vehicleType,
      vehicleCollectionType: vehicleCollectionType,
      vehicleCollectionUnit: vehicleCollectionUnit,
      vehicleDistanceUnit: vehicleDistanceUnit
    }
  }

  getVehicleCollectionType(collectionLabel: string): number {
    if (collectionLabel == 'Fuel Usage') {
      return 1;
    } else if (collectionLabel == 'Mileage') {
      return 2;
    }
    return;
  }

  parseGlobalWarmingPotentials(excelMeter: any, startingUnit: string): { globalWarmingPotentialOption: number, globalWarmingPotential: number } {
    let excelGWPOption: string = excelMeter['Fuel or Emission'];

    let selectedGWPOption: GlobalWarmingPotential = GlobalWarmingPotentials.find(gwpOption => {
      return gwpOption.label == excelGWPOption;
    });
    if (selectedGWPOption) {
      let conversionHelper: number = new ConvertValue(1, 'kg', startingUnit).convertedValue;
      let convertedGWP: number = selectedGWPOption.gwp / conversionHelper;
      return {
        globalWarmingPotential: convertedGWP,
        globalWarmingPotentialOption: selectedGWPOption.value
      }
    }
    return {
      globalWarmingPotential: undefined,
      globalWarmingPotentialOption: undefined
    }
  }

  getMeterReadingDataApplicationV2(excelSelection: 'Calendarize' | 'Do Not Calenderize' | 'Evenly Distribute'): MeterReadingDataApplication {
    if (excelSelection == 'Calendarize') {
      return 'backward';
    } else if (excelSelection == 'Do Not Calenderize') {
      return 'fullMonth';
    } else if (excelSelection == 'Evenly Distribute') {
      return 'fullYear';
    };
  }
}

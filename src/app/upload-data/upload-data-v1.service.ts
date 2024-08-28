import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from '../shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { EGridService } from '../shared/helper-services/e-grid.service';
import * as _ from 'lodash';
import { checkShowHeatCapacity, checkShowSiteToSource, getHeatingCapacity, getIsEnergyMeter, getIsEnergyUnit, getSiteToSource } from '../shared/sharedHelperFuntions';
import { MeterPhase } from '../models/constantsAndTypes';
import { SubRegionData } from '../models/eGridEmissions';
import { getMeterDataCopy } from '../calculations/conversions/convertMeterData';
import { FuelTypeOption } from '../shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from '../shared/fuel-options/getFuelTypeOptions';
import { ColumnGroup, ColumnItem, FacilityGroup, FileReference, ParsedTemplate } from './upload-data-models';
import { checkImportCellNumber, checkImportStartingUnit, checkSameDay, getAgreementType, getCountryCode, getFuelEnum, getMeterReadingDataApplication, getMeterSource, getPhase, getScope, getState, getYesNoBool, getZip } from './upload-helper-functions';
import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';
import { SetupWizardService } from '../setup-wizard/setup-wizard.service';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '../models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbPredictorEntryDeprecated } from '../models/idbModels/deprecatedPredictors';
import { IdbPredictor } from '../models/idbModels/predictor';
import { IdbPredictorData } from '../models/idbModels/predictorData';

@Injectable({
  providedIn: 'root'
})
export class UploadDataV1Service {

  constructor(private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService,
    private eGridService: EGridService,
    private uploadDataSharedFunctionsService: UploadDataSharedFunctionsService,
    private setupWizardService: SetupWizardService) { }

  parseTemplate(workbook: XLSX.WorkBook, inSetupWizard: boolean): ParsedTemplate {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities']);
    let importFacilities: Array<IdbFacility> = new Array();
    let selectedAccount: IdbAccount;
    if (inSetupWizard) {
      selectedAccount = this.setupWizardService.account.getValue();
    } else {
      selectedAccount = this.accountDbService.selectedAccount.getValue();
    }
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
        facility.naics2 = facilityDataRow['NAICS Code 2'];
        facility.naics3 = facilityDataRow['NAICS Code 3'];
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
    })
    let metersData = XLSX.utils.sheet_to_json(workbook.Sheets['Meters-Utilities']);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    let importMeters: Array<IdbUtilityMeter> = new Array();
    let newGroups: Array<IdbUtilityMeterGroup> = new Array();
    metersData.forEach(meterData => {
      let facilityName: string = meterData['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
        if (facility) {
          let meterNumber: string = meterData['Meter Number'];
          let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
          if (!meter || !facility.id || facility.guid != meter.facilityId) {
            meter = getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }

          meter.meterNumber = meterNumber;
          meter.accountNumber = meterData['Account Number'];
          meter.source = getMeterSource(meterData['Source']);
          meter.name = meterData['Meter Name'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = meterData['Utility Supplier'];
          meter.notes = meterData['Notes'];
          meter.location = meterData['Building / Location'];
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(meterData['Meter Group'], facility.guid, newGroups, selectedAccount, meter.source);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }
          meter.phase = getPhase(meterData['Phase']);
          if (meter.source == 'Water Discharge') {
            meter.waterDischargeType = meterData['Fuel'];
          } else if (meter.source == 'Water Intake') {
            meter.waterIntakeType = meterData['Fuel'];
          } else {
            meter.fuel = getFuelEnum(meterData['Fuel'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
          }
          meter.startingUnit = checkImportStartingUnit(meterData['Collection Unit'], meter.source, meter.phase, meter.fuel, meter.scope);
          meter.heatCapacity = meterData['Heat Capacity'];
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (isEnergyUnit) {
            meter.energyUnit = meter.startingUnit;
          }
          if (!meter.heatCapacity) {
            if (!isEnergyUnit) {
              let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(meter.source, meter.phase, [], meter.scope, meter.vehicleCategory, meter.vehicleType);
              let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
              meter.heatCapacity = getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit, fuel);
            }
          }
          // meter.heatCapacity = meterData['Heat Capacity'];
          meter.siteToSource = meterData['Site To Source'];
          meter.scope = getScope(meterData['Scope']);
          if (meter.scope == undefined) {
            meter.scope = this.editMeterFormService.getDefaultScope(meter.source);
          }
          meter.agreementType = getAgreementType(meterData['Agreement Type']);
          if (meter.agreementType == undefined && meter.source == 'Electricity') {
            meter.agreementType = 1;
          }
          meter.includeInEnergy = getYesNoBool(meterData['Include In Energy']);
          if (meter.includeInEnergy == undefined) {
            if (meter.agreementType != 4 && meter.agreementType != 6) {
              meter.includeInEnergy = true;
            } else {
              meter.includeInEnergy = false;
            }
          }
          meter.retainRECs = getYesNoBool(meterData['Retain RECS']);
          if (meter.retainRECs == undefined && meter.source == 'Electricity') {
            if (meter.agreementType == 1) {
              meter.retainRECs = false;
            } else {
              meter.retainRECs = true;
            }
          }

          if (meter.agreementType != undefined) {
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
          }


          if (meter.siteToSource == undefined) {
            let selectedFuelTypeOption: FuelTypeOption;
            if (meter.fuel != undefined) {
              let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(meter.source, meter.phase, [], meter.scope, meter.vehicleCategory, meter.vehicleType);
              selectedFuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
            }
            let siteToSource: number = getSiteToSource(meter.source, selectedFuelTypeOption, meter.agreementType);
            meter.siteToSource = siteToSource;
          }
          meter.meterReadingDataApplication = getMeterReadingDataApplication(meterData['Calendarize Data?']);

          meter = this.editMeterFormService.setMultipliers(meter);
          importMeters.push(meter);
        }
      }
    })
    //meter readings
    let importMeterData: Array<IdbUtilityMeterData> = this.getMeterDataEntries(workbook, importMeters);
    //predictors
    let importPredictors: Array<IdbPredictor> = this.uploadDataSharedFunctionsService.getPredictors(workbook, importFacilities);
    let importPredictorData: Array<IdbPredictorData> = this.uploadDataSharedFunctionsService.getPredictorData(workbook, importFacilities, importPredictors);
    return { importFacilities: importFacilities, importMeters: importMeters, predictors: importPredictors, predictorData: importPredictorData, meterData: importMeterData, newGroups: newGroups }
  }

  getMeterDataEntries(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity']);
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let utilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.map(meterData => { return getMeterDataCopy(meterData) });

    electricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = utilityMeterData.find(meterDataItem => {
          if (meterDataItem.meterId == meter.guid) {
            let dateItemDate: Date = new Date(meterDataItem.readDate);
            return checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = getNewIdbUtilityMeterData(meter, []);
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
    })


    let noElectricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Non-electricity']);
    noElectricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = utilityMeterData.find(meterDataItem => {
          if (meterDataItem.meterId == meter.guid) {
            let dateItemDate: Date = new Date(meterDataItem.readDate);
            return checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = getNewIdbUtilityMeterData(meter, []);
        }
        let totalVolume: number = 0;
        let energyUse: number = 0;
        let totalConsumption: number = checkImportCellNumber(dataPoint['Total Consumption']);
        let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
        let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
        if (!displayVolumeInput) {
          energyUse = totalConsumption;
        } else {
          totalVolume = totalConsumption;
          if (displayEnergyUse && totalVolume) {
            energyUse = totalVolume * meter.heatCapacity;
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


  getMeterFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;
    templateData.importFacilities.forEach(facility => {
      let facilityMeters: Array<IdbUtilityMeter> = templateData.importMeters.filter(meter => { return meter.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      facilityMeters.forEach(meter => {
        groupItems.push({
          index: meterIndex,
          value: meter.name,
          id: meter.guid,
        });
        meterIndex++;
      })
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    return facilityGroups;
  }


  getPredictorFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, predictors: Array<IdbPredictor> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let predictorIndex: number = 0;
    templateData.importFacilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictor> = templateData.predictors.filter(entry => { return entry.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      if (facilityPredictors.length > 0) {
        facilityPredictors.forEach(predictor => {
          groupItems.push({
            index: predictorIndex,
            value: predictor.name,
            id: predictor.guid,
            isExisting: predictor.id != undefined,
            isProductionPredictor: predictor.production
          });
          predictorIndex++;
        })
        facilityGroups.push({
          facilityId: facility.guid,
          groupItems: groupItems,
          facilityName: facility.name,
          color: facility.color
        });
      }
    });
    return facilityGroups;
    return [];
  }

  parseMetersFromGroups(fileReference: FileReference): Array<IdbUtilityMeter> {
    let meters: Array<IdbUtilityMeter> = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    fileReference.meterFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Meters') {
        let facility: IdbFacility = fileReference.importFacilities.find(facility => { return group.facilityId == facility.guid });
        group.groupItems.forEach(groupItem => {
          let meter: IdbUtilityMeter = accountMeters.find(accMeter => { return accMeter.name == groupItem.value && accMeter.facilityId == facility.guid });
          if (!meter) {
            meter = this.getNewMeterFromExcelColumn(groupItem, facility);
          }
          meters.push(meter);
        });
      };
    });
    return meters;
  }

  getNewMeterFromExcelColumn(groupItem: ColumnItem, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, selectedFacility.energyUnit);
    let fuelType: { phase: MeterPhase, fuelTypeOption: FuelTypeOption } = this.energyUnitsHelperService.parseFuelType(groupItem.value);
    if (fuelType) {
      newMeter.source = "Other Fuels";
      newMeter.phase = fuelType.phase;
      newMeter.scope = 1;
      newMeter.fuel = fuelType.fuelTypeOption.value;
      newMeter.heatCapacity = fuelType.fuelTypeOption.heatCapacityValue;
      newMeter.siteToSource = fuelType.fuelTypeOption.siteToSourceMultiplier;
      //check if unit is in name
      let startingUnit: string = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (startingUnit) {
        newMeter.startingUnit = startingUnit;
      } else {
        //use fuel option
        newMeter.startingUnit = fuelType.fuelTypeOption.startingUnit;
      }
      let isEnergyUnit: boolean = getIsEnergyUnit(startingUnit);
      if (isEnergyUnit) {
        newMeter.energyUnit = startingUnit;
      } else {
        newMeter.energyUnit = selectedFacility.energyUnit;
      }
    } else {
      newMeter.source = this.energyUnitsHelperService.parseSource(groupItem.value);
      newMeter.startingUnit = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (newMeter.source == 'Electricity') {
        newMeter.scope = 3
        if (newMeter.startingUnit == undefined || getIsEnergyUnit(newMeter.startingUnit) == false) {
          newMeter.startingUnit = 'kWh';
          newMeter.energyUnit = 'kWh';
        }
      } else if (newMeter.source == 'Natural Gas') {
        newMeter.scope = 1;
      } else if (newMeter.source == 'Other Energy') {
        newMeter.scope = 4;
      }
      if (newMeter.startingUnit && newMeter.source) {
        let isEnergyUnit: boolean = getIsEnergyUnit(newMeter.startingUnit);
        if (isEnergyUnit) {
          newMeter.energyUnit = newMeter.startingUnit;
        } else {
          newMeter.energyUnit = selectedFacility.energyUnit;
        }
        let showHeatCapacity: boolean = checkShowHeatCapacity(newMeter.source, newMeter.startingUnit, newMeter.scope);
        if (showHeatCapacity) {
          newMeter.heatCapacity = getHeatingCapacity(newMeter.source, newMeter.startingUnit, newMeter.energyUnit);
        }
        let showSiteToSource: boolean = checkShowSiteToSource(newMeter.source, newMeter.includeInEnergy, newMeter.scope);
        if (showSiteToSource) {
          newMeter.siteToSource = getSiteToSource(newMeter.source);
        }
      }
    }
    newMeter.name = groupItem.value;
    //use import wizard name so that the name of the meter can be changed but 
    //we can still access the data using this value
    newMeter.importWizardName = groupItem.value;
    //start with random meter number
    newMeter.meterNumber = selectedFacility.name.replace(' ', '_') + '_' + newMeter.source.replace(' ', '_') + '_' + Math.random().toString(36).substr(2, 3);

    //set emissions mulitpliers
    newMeter = this.editMeterFormService.setMultipliers(newMeter);
    return newMeter;
  }
}

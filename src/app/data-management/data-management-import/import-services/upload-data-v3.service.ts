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
import { checkImportCellNumber, checkImportStartingUnit, checkSameDay, getAgreementType, getCountryCode, getMeterSource, getScope, getState, getYesNoBool, getZip, parseNAICs } from './upload-helper-functions';
import * as _ from 'lodash';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SubRegionData } from 'src/app/models/eGridEmissions';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { getGUID, getIsEnergyUnit, getSiteToSource } from 'src/app/shared/sharedHelperFuntions';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';
import { ChargeCostUnit, MeterChargeType } from 'src/app/shared/shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';
@Injectable({
  providedIn: 'root'
})
export class UploadDataV3Service {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private utilityMeterDbService: UtilityMeterdbService,
    private editMeterFormService: EditMeterFormService,
    private uploadDataSharedFunctionsService: UploadDataSharedFunctionsService
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
      // let importMetersAndGroups: { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } = this.getImportMeters(workbook, importFacilities, selectedAccount);
      // let importMeterData: Array<IdbUtilityMeterData> = this.getUtilityMeterData(workbook, importMetersAndGroups.meters);
      // let importPredictors: Array<IdbPredictor> = this.uploadDataSharedFunctionsService.getPredictors(workbook, importFacilities);
      // let importPredictorData: Array<IdbPredictorData> = this.uploadDataSharedFunctionsService.getPredictorData(workbook, importFacilities, importPredictors);
      let importMetersAndGroups: { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } = { meters: meters, newGroups: newGroups };
      let importMeterData: Array<IdbUtilityMeterData> = [];
      let importPredictors: Array<IdbPredictor> = [];
      let importPredictorData: Array<IdbPredictorData> = [];

      return { importFacilities: importFacilities, importMeters: importMetersAndGroups.meters, predictors: importPredictors, predictorData: importPredictorData, meterData: importMeterData, newGroups: importMetersAndGroups.newGroups }
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
          dbDataPoint = getNewIdbUtilityMeterData(meter, []);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalEnergyUse = checkImportCellNumber(dataPoint['Total Usage']);
        dbDataPoint.totalRealDemand = checkImportCellNumber(dataPoint['Actual Demand']);
        dbDataPoint.totalBilledDemand = checkImportCellNumber(dataPoint['Total Billed Demand']);
        dbDataPoint.totalCost = checkImportCellNumber(dataPoint['Total Cost ($)']);
        dbDataPoint.powerFactor = checkImportCellNumber(dataPoint['Power Factor']);

        meter.charges.forEach(charge => {
          if (dataPoint[charge.name]) {
            let dbCharge: MeterDataCharge = dbDataPoint.charges.find(dataCharge => {
              return dataCharge.chargeGuid == charge.guid
            });
            if (dbCharge) {

            } else {
              dbDataPoint.charges.push({
                chargeGuid: charge.guid,
                chargeAmount: checkImportCellNumber(dataPoint[charge.name]),
                chargeUsage: checkImportCellNumber(dataPoint[charge.name + ' Usage'])
              })
            }
          }
        })



        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  addMeterDataCharges() {

  }


  addCharges(excelMeter, meter: IdbUtilityMeter) {
    for (let i = 1; i < 16; i++) {
      if (excelMeter['Cost ' + i + ' Name']) {
        let chargeName: string = excelMeter['Cost ' + i + ' Name'];
        let charge: MeterCharge = meter.charges.find(charge => {
          return charge.name == chargeName
        });
        if (charge) {
          charge.name = excelMeter['Cost ' + i + ' Name'];
          charge.chargeType = this.getChargeType(excelMeter['Cost ' + i + ' Type']);
          charge.chargeUnit = this.getChargeUnit(excelMeter['Cost ' + i + ' Unit']);
        } else {
          charge = {
            guid: getGUID(),
            name: excelMeter['Cost ' + i + ' Name'],
            chargeType: this.getChargeType(excelMeter['Cost ' + i + ' Type']),
            chargeUnit: this.getChargeUnit(excelMeter['Cost ' + i + ' Unit']),
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
      }
    }
    return undefined;
  }

  getChargeUnit(excelChargeUnit: string): ChargeCostUnit {
    if (excelChargeUnit) {
      if (excelChargeUnit == '$/kW') {
        return 'dollarsPerKilowatt';
      } else if (excelChargeUnit == '$/kVA') {
        return 'dollarsPerKVa';
      } else if (excelChargeUnit == '$/MW') {
        return 'dollarsPerMW';
      } else if (excelChargeUnit == '$/MVA') {
        return 'dollarsPerMVA';
      } else if (excelChargeUnit == '%') {
        return 'percent';
      } else if (excelChargeUnit == '$') {
        return 'dollars';
      } else if (excelChargeUnit == '$/kWh') {
        return 'dollarsPerKilowattHour';
      } else if (excelChargeUnit == '$/MWh') {
        return 'dollarsPerMWh';
      } else if (excelChargeUnit == '$/MMBtu') {
        return 'dollarsPerMMBtu';
      } else if (excelChargeUnit == '$/GJ') {
        return 'dollarsPerGJ';
      } else if (excelChargeUnit == '$/MJ') {
        return 'dollarsPerMJ';
      } else if (excelChargeUnit == '$/kJ') {
        return 'dollarsPerkJ';
      } else if (excelChargeUnit == '$/Therms') {
        return 'dollarsPerTherms';
      } else if (excelChargeUnit == '$/DTherms') {
        return 'dollarsPerDTherms';
      } else if (excelChargeUnit == '$/kcal') {
        return 'dollarsPerKcal';
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
}

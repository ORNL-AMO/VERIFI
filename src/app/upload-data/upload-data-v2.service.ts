import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../models/idb';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import * as _ from 'lodash';
import { checkImportStartingUnit, getAgreementType, getCountryCode, getFuelEnum, getMeterReadingDataApplication, getMeterSource, getPhase, getScope, getState, getYesNoBool, getZip } from './upload-helper-functions';
import { EGridService } from '../shared/helper-services/e-grid.service';
import { SubRegionData } from '../models/eGridEmissions';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { FuelTypeOption } from '../shared/fuel-options/fuelTypeOption';
import { getFuelTypeOptions } from '../shared/fuel-options/getFuelTypeOptions';
import { getHeatingCapacity, getIsEnergyUnit, getSiteToSource } from '../shared/sharedHelperFuntions';
import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataV2Service {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private utilityMeterDbService: UtilityMeterdbService,
    private uploadDataSharedFunctionsService: UploadDataSharedFunctionsService,
    private editMeterFormService: EditMeterFormService) { }


  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    //TODO: Make sure at least one facility found or throw error...
    let importFacilities: Array<IdbFacility> = this.getImportFacilities(workbook, selectedAccount);
    let importMeters: Array<IdbUtilityMeter> = this.getImportMeters(workbook, importFacilities, selectedAccount);
    let predictorEntries: Array<IdbPredictorEntry>;
    let importMeterData: Array<IdbUtilityMeterData>;
    let newGroups: Array<IdbUtilityMeterGroup>;


    return { importFacilities: importFacilities, importMeters: importMeters, predictorEntries: predictorEntries, meterData: importMeterData, newGroups: newGroups }

  }

  getImportFacilities(workbook: XLSX.WorkBook, selectedAccount: IdbAccount): Array<IdbFacility> {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities']);
    console.log(facilitiesData);
    let importFacilities: Array<IdbFacility> = new Array();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();
    facilitiesData.forEach(facilityDataRow => {
      let facilityName: string = facilityDataRow['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = accountFacilities.find(facility => { return facility.name == facilityName });
        if (!facility) {
          facility = this.facilityDbService.getNewIdbFacility(selectedAccount);
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

  getImportMeters(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount): Array<IdbUtilityMeter> {
    let excelMeters = XLSX.utils.sheet_to_json(workbook.Sheets['Meters-Utilities']);
    console.log(excelMeters);
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
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.uploadDataSharedFunctionsService.getMeterGroup(excelMeter['Meter Group'], facility.guid, newGroups);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }

          meter.startingUnit = checkImportStartingUnit(excelMeter['Collection Unit'], meter.source, meter.phase, meter.fuel, meter.scope);
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (isEnergyUnit) {
            meter.energyUnit = meter.startingUnit;
          }


          if (meter.source == 'Electricity') {
            //parse electricity
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


          } else if (meter.source == 'Natural Gas') {
            //pares NG
            meter.phase = 'Gas';
            meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          } else if (meter.source == 'Other Fuels') {
            if (meter.scope != 2) {
              //parse stationary if not vehicle
              meter.phase = getPhase(excelMeter['Phase or Vehicle']);
              meter.fuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
              meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            } else if (meter.scope == 2) {
              //TODO: parse vehicles
              meter.vehicleCategory
              meter.vehicleType
              meter.vehicleCollectionType
              meter.vehicleCollectionUnit
              meter.vehicleFuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
              meter.vehicleFuelEfficiency = excelMeter['Heat Capacity or Fuel Efficiency'];
            }
          } else if (meter.source == 'Other Energy') {
            //parse other energy
            meter.fuel = getFuelEnum(excelMeter['Fuel or Emission'], meter.source, meter.phase, meter.scope, meter.vehicleCategory, meter.vehicleType);
            meter.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
            meter.siteToSource = this.parseSiteToSource(excelMeter, meter);
          } else if (meter.source == 'Water Discharge') {
            //parse water discharge
            meter.waterDischargeType = excelMeter['Fuel or Emission'];
          } else if (meter.source == 'Water Intake') {
            //parse water intake
            meter.waterIntakeType = excelMeter['Fuel or Emission'];
          } else if (meter.source == 'Other') {
            //parse other
            //Need anything for fugitive/process ?
          }

          meter.meterReadingDataApplication = getMeterReadingDataApplication(excelMeter['Calendarize Data?']);
          meter = this.editMeterFormService.setMultipliers(meter);
          importMeters.push(meter);
        }
      }
    })
    return importMeters;
  }


  parseHeatCapacity(excelMeter: any, meter: IdbUtilityMeter, isEnergyUnit: boolean): number {
    let heatCapacity: number = excelMeter['Heat Capacity or Fuel Efficiency'];
    if (!heatCapacity && !isEnergyUnit) {
      let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(meter.source, meter.phase, [], meter.scope, meter.vehicleCategory, meter.vehicleType);
      let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
      heatCapacity = getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit, fuel);
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
}

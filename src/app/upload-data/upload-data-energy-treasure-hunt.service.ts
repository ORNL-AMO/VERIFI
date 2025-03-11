import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
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
import { getNewIdbUtilityMeter, IdbUtilityMeter, MeterReadingDataApplication } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbPredictor } from '../models/idbModels/predictor';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { Months } from '../shared/form-data/months';


@Injectable({
  providedIn: 'root'
})
export class UploadDataEnergyTreasureHuntService {

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
    let importFacility: IdbFacility = this.getImportFacilities(workbook, selectedAccount);
    if (!importFacility) {
      throw ('No Facilities Found!')
    } else {
      let meters: Array<IdbUtilityMeter> = [];
      let meterData: Array<IdbUtilityMeterData> = [];
      let hostPLantUtilitiesWorksheet: XLSX.WorkSheet = workbook.Sheets['Host Plant Utilities'];
      //electricity
      let electricityMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getElectricityMeterAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (electricityMeterAndData.meterData.length != 0) {
        meters.push(electricityMeterAndData.meter);
        electricityMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //NG
      let naturalGasMeter: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getNaturalGasMeterAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (naturalGasMeter.meterData.length != 0) {
        meters.push(naturalGasMeter.meter);
        naturalGasMeter.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //coal and/or oil consumption
      let coalOilMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getCoalOilMeterAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (coalOilMeterAndData.meterData.length != 0) {
        meters.push(coalOilMeterAndData.meter);
        coalOilMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //other energy consumption
      let otherEnergyMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getOtherEnergyMeterAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (otherEnergyMeterAndData.meterData.length != 0) {
        meters.push(otherEnergyMeterAndData.meter);
        otherEnergyMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //utility water
      let waterMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterMeterAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (waterMeterAndData.meterData.length != 0) {
        meters.push(waterMeterAndData.meter);
        waterMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //utility sewer
      let sewerMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterSewerAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (sewerMeterAndData.meterData.length != 0) {
        meters.push(sewerMeterAndData.meter);
        sewerMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      //self sourced water
      let selfWaterMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterOtherAndData(hostPLantUtilitiesWorksheet, importFacility, selectedAccount);
      if (selfWaterMeterAndData.meterData.length != 0) {
        meters.push(selfWaterMeterAndData.meter);
        selfWaterMeterAndData.meterData.forEach(mData => {
          meterData.push(mData);
        })
      }
      return { importFacilities: [importFacility], importMeters: meters, predictors: [], predictorData: [], meterData: meterData, newGroups: [] }
    }
  }

  getImportFacilities(workbook: XLSX.WorkBook, selectedAccount: IdbAccount): IdbFacility {
    let hostPlantSummaryWorksheet: XLSX.WorkSheet = workbook.Sheets['Host Plant Summary'];
    let facilityName: string = hostPlantSummaryWorksheet['C9']?.v;
    // let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Host Plant Summary']);
    // console.log(facilitiesData);
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();
    // facilitiesData.forEach(facilityDataRow => {
    //   let facilityName: string = facilityDataRow['Facility Name'];
    let facility: IdbFacility;
    if (facilityName) {
      facility = accountFacilities.find(facility => { return facility.name == facilityName });
      console.log(facility);
      if (!facility) {
        facility = getNewIdbFacility(selectedAccount);
        facility.name = facilityName;
      }
    } else {
      facility.name = 'ETH Facility';
    }
    //TODO: Parse addtional data from document
    // facility.address = facilityDataRow['Address'];
    // facility.country = getCountryCode(facilityDataRow['Country']);
    // facility.state = getState(facilityDataRow['State']);
    // facility.city = facilityDataRow['City'];
    // facility.zip = getZip(facilityDataRow['Zip']);
    // facility.naics2 = facilityDataRow['NAICS Code 2 digit'];
    // facility.naics3 = facilityDataRow['NAICS Code 3 digit'];
    // facility.contactName = facilityDataRow['Contact Name'];
    // facility.contactPhone = facilityDataRow['Contact Phone'];
    // facility.contactEmail = facilityDataRow['Contact Email'];
    // if (facility.zip && facility.zip.length == 5) {
    //   let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == facility.zip });
    //   if (subRegionData) {
    //     if (subRegionData.subregions.length != 0) {
    //       facility.eGridSubregion = subRegionData.subregions[0]
    //     }
    //   }
    // }
    //   }
    // });
    return facility;
  }

  getElectricityMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let electricConsumptionMeter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kWh');
    electricConsumptionMeter.name = 'Electric';
    electricConsumptionMeter.meterReadingDataApplication = 'fullMonth';
    //TODO: set electricity details
    electricConsumptionMeter.source = 'Electricity';
    electricConsumptionMeter.siteToSource = 3;
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 8; index < 32; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['G' + index]?.v;
      //TODO: PEAK DEMAND GOES WHERE?
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(electricConsumptionMeter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = siteEnergy;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: electricConsumptionMeter, meterData: meterData }
  }

  getNaturalGasMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let ngConsumptionMeter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    ngConsumptionMeter.source = 'Natural Gas';
    ngConsumptionMeter.name = 'Natural Gas';
    ngConsumptionMeter.phase = 'Gas';
    ngConsumptionMeter.meterReadingDataApplication = 'fullMonth';
    ngConsumptionMeter.scope = 1;
    //TODO: set NG details
    // this.setMeterUnits(excelMeter, meter, facility);
    // let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
    // ngConsumption.heatCapacity = this.parseHeatCapacity(excelMeter, meter, isEnergyUnit);
    // ngConsumption.siteToSource = this.parseSiteToSource(excelMeter, meter);
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 38; index < 62; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(ngConsumptionMeter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = siteEnergy;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: ngConsumptionMeter, meterData: meterData }
  }


  //coal and/or oil consumption
  getCoalOilMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kWh');
    meter.name = 'Coal and/or Oil';
    meter.meterReadingDataApplication = 'fullMonth';
    //TODO: set meter details
    meter.source = 'Other Fuels';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 68; index < 92; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = siteEnergy;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: meter, meterData: meterData }
  }
  //other energy consumption
  getOtherEnergyMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.name = 'Other Energy';
    meter.meterReadingDataApplication = 'fullMonth';
    meter.startingUnit = 'kgal';
    //TODO: set meter details
    meter.source = 'Other Fuels';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 98; index < 122; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = siteEnergy;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: meter, meterData: meterData }
  }

  //utility water
  getWaterMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.name = 'Utility Water';
    meter.meterReadingDataApplication = 'fullMonth';
    meter.includeInEnergy = false;
    meter.startingUnit = 'kgal';
    //TODO: set meter details
    meter.source = 'Water Intake';
    meter.waterIntakeType = 'Municipal (Potable)';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v
      let cost: number = worksheet['G' + index]?.v;
      if (consumption != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = 0;
        meterReading.totalVolume = consumption;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: meter, meterData: meterData }
  }
  //utility sewer
  getWaterSewerAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.name = 'Utility Sewer';
    meter.meterReadingDataApplication = 'fullMonth';
    meter.includeInEnergy = false;
    meter.startingUnit = 'kgal';
    //TODO: set meter details
    meter.source = 'Water Discharge';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v
      let cost: number = worksheet['H' + index]?.v;
      if (consumption != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = 0;
        meterReading.totalVolume = consumption;
        meterReading.totalCost = cost;
        meterData.push(meterReading)
      }
    };
    return { meter: meter, meterData: meterData }
  }

  //self sourced water
  getWaterOtherAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kgal');
    meter.name = 'Self Sourced Water';
    meter.meterReadingDataApplication = 'fullMonth';
    meter.includeInEnergy = false;
    //TODO: set meter details
    meter.source = 'Water Intake';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v;
      if (consumption != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        //check existing
        let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
        meterReading.readDate = date;
        meterReading.totalEnergyUse = 0;
        meterReading.totalVolume = consumption;
        meterData.push(meterReading)
      }
    };
    return { meter: meter, meterData: meterData }
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

  getDateFromSheet(index: number, sheet: XLSX.WorkSheet): Date {
    let monthDateStr: Date = new Date(sheet['B' + index].v);
    let monthNum: number = monthDateStr.getMonth();
    let year: number = sheet['C' + index].v
    if (monthNum == 11) {
      monthNum = 0;
    } else {
      monthNum++;
    }
    let date: Date = new Date(year, monthNum, 1);
    return date;
  }
}

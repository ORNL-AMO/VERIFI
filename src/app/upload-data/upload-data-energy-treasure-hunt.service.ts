import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import * as _ from 'lodash';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '../models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { checkSameDay, getCountryCode, getState, getZip } from './upload-helper-functions';
import { SubRegionData } from '../models/eGridEmissions';
import { EGridService } from '../shared/helper-services/e-grid.service';


@Injectable({
  providedIn: 'root'
})
export class UploadDataEnergyTreasureHuntService {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService) { }


  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let hostPlantSummaryWorksheet: XLSX.WorkSheet = workbook.Sheets['Host Plant Summary'];
    let hostPlant: IdbFacility = this.getImportFacilities(hostPlantSummaryWorksheet, selectedAccount, 'Host Plant');
    let hostPlantUtilitiesWorksheet: XLSX.WorkSheet = workbook.Sheets['Host Plant Utilities'];
    let hostPlantResults: ParsedTemplate = this.getTemplateResultsFromWorksheet(hostPlant, selectedAccount, hostPlantUtilitiesWorksheet);

    let exchangePlantSummaryWorksheet: XLSX.WorkSheet = workbook.Sheets['Exchange Plant Summary'];
    let exchangePlant: IdbFacility = this.getImportFacilities(exchangePlantSummaryWorksheet, selectedAccount, 'Exchange Plant');
    let exchangePlantUtilitiesWorksheet: XLSX.WorkSheet = workbook.Sheets['Exchange Plant Utilities'];
    let exchangePlantResults: ParsedTemplate = this.getTemplateResultsFromWorksheet(exchangePlant, selectedAccount, exchangePlantUtilitiesWorksheet)

    if (exchangePlantResults.meterData.length > 0 || exchangePlantResults.predictorData.length > 0) {
      return {
        importFacilities: [hostPlant, exchangePlant],
        importMeters: _.concat(hostPlantResults.importMeters, exchangePlantResults.importMeters),
        predictors: _.concat(hostPlantResults.predictors, exchangePlantResults.predictors),
        predictorData: _.concat(hostPlantResults.predictorData, exchangePlantResults.predictorData),
        meterData: _.concat(hostPlantResults.meterData, exchangePlantResults.meterData),
        newGroups: []
      }
    } else {
      return { importFacilities: [hostPlant], importMeters: hostPlantResults.importMeters, predictors: hostPlantResults.predictors, predictorData: hostPlantResults.predictorData, meterData: hostPlantResults.meterData, newGroups: [] }
    }

  }

  getTemplateResultsFromWorksheet(facility: IdbFacility, account: IdbAccount, worksheet: XLSX.WorkSheet): ParsedTemplate {
    let meters: Array<IdbUtilityMeter> = [];
    let meterData: Array<IdbUtilityMeterData> = [];
    //electricity
    let electricityMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getElectricityMeterAndData(worksheet, facility, account);
    if (electricityMeterAndData.meterData.length != 0) {
      meters.push(electricityMeterAndData.meter);
      electricityMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //NG
    let naturalGasMeter: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getNaturalGasMeterAndData(worksheet, facility, account);
    if (naturalGasMeter.meterData.length != 0) {
      meters.push(naturalGasMeter.meter);
      naturalGasMeter.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //coal and/or oil consumption
    let coalOilMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getCoalOilMeterAndData(worksheet, facility, account);
    if (coalOilMeterAndData.meterData.length != 0) {
      meters.push(coalOilMeterAndData.meter);
      coalOilMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //other energy consumption
    let otherEnergyMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getOtherEnergyMeterAndData(worksheet, facility, account);
    if (otherEnergyMeterAndData.meterData.length != 0) {
      meters.push(otherEnergyMeterAndData.meter);
      otherEnergyMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //utility water
    let waterMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterMeterAndData(worksheet, facility, account);
    if (waterMeterAndData.meterData.length != 0) {
      meters.push(waterMeterAndData.meter);
      waterMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //utility sewer
    let sewerMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterSewerAndData(worksheet, facility, account);
    if (sewerMeterAndData.meterData.length != 0) {
      meters.push(sewerMeterAndData.meter);
      sewerMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    //self sourced water
    let selfWaterMeterAndData: { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } = this.getWaterOtherAndData(worksheet, facility, account);
    if (selfWaterMeterAndData.meterData.length != 0) {
      meters.push(selfWaterMeterAndData.meter);
      selfWaterMeterAndData.meterData.forEach(mData => {
        meterData.push(mData);
      })
    }
    let pData: { predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData> } = this.getProductionData(worksheet, facility, account);
    return { importFacilities: [facility], importMeters: meters, predictors: pData.predictors, predictorData: pData.predictorData, meterData: meterData, newGroups: [] }
  }


  getImportFacilities(worksheet: XLSX.WorkSheet, selectedAccount: IdbAccount, defaultFacilityName: string): IdbFacility {
    let facilityName: string = worksheet['C9']?.v;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();
    let facility: IdbFacility;
    if (facilityName) {
      facility = accountFacilities.find(facility => { return facility.name == facilityName });
      if (!facility) {
        facility = getNewIdbFacility(selectedAccount);
        facility.name = facilityName;
      }
    } else {
      facility = getNewIdbFacility(selectedAccount);
      if (!facilityName) {
        facility.name = facilityName;
      } else {
        facility.name = defaultFacilityName;
      }
    }
    facility.address = worksheet['F9']?.v;
    facility.country = getCountryCode("US");
    facility.state = getState(worksheet['F11']?.v);
    facility.city = worksheet['F10']?.v;
    facility.zip = getZip(worksheet['F12']?.v);
    facility.size = worksheet['C13']?.v;
    if (facility.zip && facility.zip.length == 5) {
      let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == facility.zip });
      if (subRegionData) {
        if (subRegionData.subregions.length != 0) {
          facility.eGridSubregion = subRegionData.subregions[0]
        }
      }
    }
    return facility;
  }

  getElectricityMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let electricConsumptionMeter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kWh');
    electricConsumptionMeter.name = 'Electric';
    electricConsumptionMeter.meterReadingDataApplication = 'fullMonth';
    electricConsumptionMeter.source = 'Electricity';
    electricConsumptionMeter.siteToSource = 3;
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 8; index < 32; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['G' + index]?.v;
      let demandUsage: number = worksheet['F' + index]?.v;
      //TODO: PEAK DEMAND AFTER REFACTOR
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(electricConsumptionMeter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = siteEnergy;
          meterReading.totalCost = cost;
          meterReading.totalBilledDemand = demandUsage;
          meterData.push(meterReading)
        }
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
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 38; index < 62; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(ngConsumptionMeter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = siteEnergy;
          meterReading.totalCost = cost;
          meterData.push(meterReading)
        }
      }
    };
    return { meter: ngConsumptionMeter, meterData: meterData }
  }


  //coal and/or oil consumption
  getCoalOilMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.name = 'Coal and/or Oil';
    meter.scope = 1;
    meter.meterReadingDataApplication = 'fullMonth';
    meter.source = 'Other Fuels';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 68; index < 92; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = siteEnergy;
          meterReading.totalCost = cost;
          meterData.push(meterReading)
        }
      }
    };
    return { meter: meter, meterData: meterData }
  }
  //other energy consumption
  getOtherEnergyMeterAndData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> } {
    //check existing
    let meter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.startingUnit = 'MMBtu';
    meter.name = 'Other Energy';
    meter.scope = 4;
    meter.meterReadingDataApplication = 'fullMonth';
    meter.source = 'Other Energy';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 98; index < 122; index++) {
      let siteEnergy: number = worksheet['D' + index]?.v
      let cost: number = worksheet['F' + index]?.v;
      if (siteEnergy != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = siteEnergy;
          meterReading.totalCost = cost;
          meterData.push(meterReading)
        }
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
    meter.scope = 100;
    meter.startingUnit = 'kgal';
    meter.source = 'Water Intake';
    meter.waterIntakeType = 'Municipal (Potable)';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v
      let cost: number = worksheet['G' + index]?.v;
      if (consumption != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = 0;
          meterReading.totalVolume = consumption;
          meterReading.totalCost = cost;
          meterData.push(meterReading)
        }
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
    meter.scope = 100;
    meter.startingUnit = 'kgal';
    meter.source = 'Water Discharge';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v
      let cost: number = worksheet['H' + index]?.v;
      if (consumption != undefined || cost != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = 0;
          meterReading.totalVolume = consumption;
          meterReading.totalCost = cost;
          meterData.push(meterReading)
        }
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
    meter.scope = 100;
    meter.source = 'Water Intake';
    let meterData: Array<IdbUtilityMeterData> = new Array();
    for (let index: number = 128; index < 152; index++) {
      let consumption: number = worksheet['D' + index]?.v;
      if (consumption != undefined) {
        let date: Date = this.getDateFromSheet(index, worksheet);
        if (date) {
          //check existing
          let meterReading: IdbUtilityMeterData = getNewIdbUtilityMeterData(meter, []);
          meterReading.readDate = date;
          meterReading.totalEnergyUse = 0;
          meterReading.totalVolume = consumption;
          meterData.push(meterReading)
        }
      }
    };
    return { meter: meter, meterData: meterData }
  }

  getProductionData(worksheet: XLSX.WorkSheet, facility: IdbFacility, account: IdbAccount): { predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData> } {
    let predictor1: IdbPredictor = getNewIdbPredictor(account.guid, facility.guid);
    //D155
    let p1Name: string = worksheet['D155']?.v;
    predictor1.name = p1Name ? p1Name : 'Production Metric 1';
    predictor1.production = true;
    let productionData1: Array<IdbPredictorData> = [];
    let predictor2: IdbPredictor = getNewIdbPredictor(account.guid, facility.guid);
    //E155
    let p2Name: string = worksheet['E155']?.v;
    predictor2.name = p2Name ? p2Name : 'Production Metric 2';
    predictor2.production = true;
    let productionData2: Array<IdbPredictorData> = [];
    let predictor3: IdbPredictor = getNewIdbPredictor(account.guid, facility.guid);
    //F155
    let p3Name: string = worksheet['F155']?.v;
    predictor3.name = p3Name ? p3Name : 'Production Metric 3';
    predictor3.production = true;
    let productionData3: Array<IdbPredictorData> = [];
    let predictorTotalHours: IdbPredictor = getNewIdbPredictor(account.guid, facility.guid);
    predictorTotalHours.name = 'Total Hours of Production';
    predictorTotalHours.production = true;
    let productionDataTotalHours: Array<IdbPredictorData> = [];

    for (let index: number = 156; index < 180; index++) {
      let date: Date = this.getDateFromSheet(index, worksheet);
      if (date) {
        let pd1: number = worksheet['D' + index]?.v;
        if (pd1) {
          let pd1Data: IdbPredictorData = getNewIdbPredictorData(predictor1)
          pd1Data.date = date;
          pd1Data.amount = pd1;
          productionData1.push(pd1Data);
        }
        let pd2: number = worksheet['E' + index]?.v;
        if (pd2) {
          let pd2Data: IdbPredictorData = getNewIdbPredictorData(predictor2)
          pd2Data.date = date;
          pd2Data.amount = pd2;
          productionData2.push(pd2Data);
        }
        let pd3: number = worksheet['F' + index]?.v;
        if (pd3) {
          let pd3Data: IdbPredictorData = getNewIdbPredictorData(predictor3)
          pd3Data.date = date;
          pd3Data.amount = pd3;
          productionData3.push(pd3Data);
        }
        let totalHours: number = worksheet['H' + index]?.v;
        if (totalHours) {
          let totalHoursData: IdbPredictorData = getNewIdbPredictorData(predictorTotalHours)
          totalHoursData.date = date;
          totalHoursData.amount = totalHours;
          productionDataTotalHours.push(totalHoursData);
        }
      }
    };

    let predictorData: Array<IdbPredictorData> = [];
    let predictors: Array<IdbPredictor> = [];
    if (productionData1.length > 0) {
      predictors.push(predictor1);
      productionData1.forEach(pData => {
        predictorData.push(pData);
      })
    }
    if (productionData2.length > 0) {
      predictors.push(predictor2);
      productionData2.forEach(pData => {
        predictorData.push(pData);
      })
    }
    if (productionData3.length > 0) {
      predictors.push(predictor3);
      productionData3.forEach(pData => {
        predictorData.push(pData);
      })
    }
    if (productionDataTotalHours.length > 0) {
      predictors.push(predictorTotalHours);
      productionDataTotalHours.forEach(pData => {
        predictorData.push(pData);
      })
    }
    return { predictorData: predictorData, predictors: predictors }
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
    let monthVal = sheet['B' + index]?.v;
    let year: number = sheet['C' + index]?.v
    if (year && monthVal) {
      let monthDateStr: Date = new Date(monthVal);
      let monthNum: number = monthDateStr.getMonth();
      if (monthNum == 11) {
        monthNum = 0;
      } else {
        monthNum++;
      }
      let date: Date = new Date(year, monthNum, 1);
      return date;
    }
    return undefined;
  }
}

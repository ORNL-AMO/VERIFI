import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkBook } from 'xlsx';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, MeterPhase, PredictorData } from '../models/idb';
import * as XLSX from 'xlsx';
import { AgreementType, AgreementTypes, FuelTypeOption, ScopeOption, ScopeOptions } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from '../shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { EnergyUseCalculationsService } from '../shared/helper-services/energy-use-calculations.service';
@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  fileReferences: Array<FileReference>;
  allFilesSet: BehaviorSubject<boolean>;
  uploadMeters: Array<IdbUtilityMeter>;
  constructor(private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService,
    private energyUseCalculationsService: EnergyUseCalculationsService) {
    this.allFilesSet = new BehaviorSubject<boolean>(false);
    this.fileReferences = new Array();
    this.uploadMeters = new Array();
  }


  getFileReference(file: File, workBook: XLSX.WorkBook): FileReference {
    let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
    if (!isTemplate) {
      let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      return {
        name: file.name,
        file: file,
        dataSubmitted: false,
        id: Math.random().toString(36).substr(2, 9),
        workbook: workBook,
        isTemplate: isTemplate,
        selectedWorksheetName: workBook.Workbook.Sheets[0].name,
        selectedWorksheetData: [],
        columnGroups: [],
        meterFacilityGroups: [],
        predictorFacilityGroups: [],
        headerMap: [],
        importFacilities: accountFacilities,
        meters: [],
        meterData: [],
        predictorEntries: [],
        skipExistingReadingsMeterIds: [],
        skipExistingPredictorFacilityIds: []
      };
    } else {
      //parse template
      let templateData: ParsedTemplate = this.parseTemplate(workBook);
      // let meterFacilityGroups: Array<FacilityGroup> = this.getMeterFacilityGroups(templateData);
      let predictorFacilityGroups: Array<FacilityGroup> = this.getPredictorFacilityGroups(templateData);
      return {
        name: file.name,
        file: file,
        dataSubmitted: false,
        id: Math.random().toString(36).substr(2, 9),
        workbook: workBook,
        isTemplate: isTemplate,
        selectedWorksheetName: undefined,
        selectedWorksheetData: [],
        columnGroups: [],
        meterFacilityGroups: [],
        predictorFacilityGroups: predictorFacilityGroups,
        headerMap: [],
        importFacilities: templateData.importFacilities,
        meters: templateData.importMeters,
        meterData: templateData.meterData,
        predictorEntries: templateData.predictorEntries,
        skipExistingReadingsMeterIds: [],
        skipExistingPredictorFacilityIds: []
      };
    }
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Help" && sheetNames[1] == 'Facilities' && sheetNames[2] == "Meters-Utilities" && sheetNames[3] == "Electricity" && sheetNames[4] == "Non-electricity" && sheetNames[5] == "Predictors") {
      return true;
    } else {
      return false;
    }
  }

  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities']);
    let importFacilities: Array<IdbFacility> = new Array();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilitiesData.forEach(facilityDataRow => {
      let facilityName: string = facilityDataRow['Facility Name'];
      let facility: IdbFacility = accountFacilities.find(facility => { return facility.name == facilityName });
      if (!facility) {
        facility = this.facilityDbService.getNewIdbFacility(selectedAccount);
        facility.name = facilityName;
      }
      facility.address = facilityDataRow['Address'];
      facility.country = facilityDataRow['Country'];
      facility.state = facilityDataRow['State'];
      facility.city = facilityDataRow['City'];
      facility.zip = facilityDataRow['Zip'];
      facility.naics2 = facilityDataRow['NAICS Code 2'];
      facility.naics3 = facilityDataRow['NAICS Code 3'];
      facility.contactName = facilityDataRow['Contact Name'];
      facility.contactPhone = facilityDataRow['Contact Phone'];
      facility.contactEmail = facilityDataRow['Contact Email'];
      importFacilities.push(facility);
    })
    let metersData = XLSX.utils.sheet_to_json(workbook.Sheets['Meters-Utilities']);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let importMeters: Array<IdbUtilityMeter> = new Array();
    metersData.forEach(meterData => {
      let facilityName: string = meterData['Facility Name'];
      let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
      let meterNumber: string = meterData['Meter Number'];
      let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
      if (!meter) {
        meter = this.utilityMeterDbService.getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, meterData['Collection Unit']);
      }
      meter.meterNumber = meterNumber;
      meter.accountNumber = meterData['Account Number'];
      meter.source = meterData['Source'];
      meter.name = meterData['Meter Name'];
      meter.supplier = meterData['Utility Supplier'];
      meter.notes = meterData['Notes'];
      meter.location = meterData['Building / Location'];
      //TODO: group, phase, fuel
      meter.group = meterData['Meter Group'];
      meter.phase = meterData['Phase'];
      meter.fuel = meterData['Fuel'];
      meter.startingUnit = meterData['Collection Unit'];
      meter.heatCapacity = meterData['Heat Capacity'];
      meter.siteToSource = meterData['Site To Source'];
      //TODO: scope, agreementType
      meter.scope = this.getScope(meterData['Scope']);
      meter.agreementType = this.getAgreementType(meterData['Agreement Type']);
      //TODO: yes/no
      meter.includeInEnergy = this.getYesNoBool(meterData['Include In Energy']);
      meter.retainRECs = this.getYesNoBool(meterData['Retain RECS']);
      importMeters.push(meter);
    })
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = this.getMeterDataEntries(workbook, importMeters);
    //predictors

    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    // debugger
    let predictorEntries: Array<IdbPredictorEntry> = new Array();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    importFacilities.forEach(facility => {
      let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
      facilityPredictorData.forEach(dataItem => {
        let dataItemDate: Date = new Date(dataItem['Date']);
        let facilityPredictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
          return this.checkSameMonth(dataItemDate, new Date(entry.date))
        });
        if (!facilityPredictorEntry) {
          facilityPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, dataItemDate);
        }
        Object.keys(dataItem).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictorIndex: number = facilityPredictorEntry.predictors.findIndex(predictor => { return predictor.name == key });
            if (predictorIndex != -1) {
              facilityPredictorEntry.predictors[predictorIndex].amount = dataItem[key];
            } else {
              let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
              newPredictor.name = key;
              newPredictor.amount = dataItem[key];
              facilityPredictorEntry.predictors.push(newPredictor);
            }
          }
        });
        if (facilityPredictorEntry.predictors.length != 0) {
          predictorEntries.push(facilityPredictorEntry);
        }
      });
    })
    return { importFacilities: importFacilities, importMeters: importMeters, predictorEntries: predictorEntries, meterData: importMeterData }
  }


  getMeterDataEntries(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity']);
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    electricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = utilityMeterData.find(meterDataItem => {
          if (meterDataItem.meterId == meter.guid) {
            let dateItemDate: Date = new Date(meterDataItem.readDate);
            return this.checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalEnergyUse = dataPoint['Total Consumption'];
        dbDataPoint.totalRealDemand = dataPoint['Total Real Demand'];
        dbDataPoint.totalBilledDemand = dataPoint['Total Billed Demand'];
        dbDataPoint.totalCost = dataPoint['Total Cost'];
        dbDataPoint.nonEnergyCharge = dataPoint['Non-energy Charge'];
        dbDataPoint.block1Consumption = dataPoint['Block 1 Consumption'];
        dbDataPoint.block1ConsumptionCharge = dataPoint['Block 1 Consumption Charge'];
        dbDataPoint.block2Consumption = dataPoint['Block 2 Consumption'];
        dbDataPoint.block2ConsumptionCharge = dataPoint['Block 2 Consumption Charge'];
        dbDataPoint.block3Consumption = dataPoint['Block 3 Consumption'];
        dbDataPoint.block3ConsumptionCharge = dataPoint['Block 3 Consumption Charge'];
        dbDataPoint.otherConsumption = dataPoint['Other Consumption'];
        dbDataPoint.otherConsumptionCharge = dataPoint['Other Consumption Charge'];
        dbDataPoint.onPeakAmount = dataPoint['On Peak Amount'];
        dbDataPoint.onPeakCharge = dataPoint['On Peak Charge'];
        dbDataPoint.offPeakAmount = dataPoint['Off Peak Amount'];
        dbDataPoint.offPeakCharge = dataPoint['Off Peak Charge'];
        dbDataPoint.transmissionAndDeliveryCharge = dataPoint['Transmission & Delivery Charge'];
        dbDataPoint.powerFactor = dataPoint['Power Factor'];
        dbDataPoint.powerFactorCharge = dataPoint['Power Factor Charge'];
        dbDataPoint.localSalesTax = dataPoint['Local Sales Tax'];
        dbDataPoint.stateSalesTax = dataPoint['State Sales Tax'];
        dbDataPoint.latePayment = dataPoint['Late Payment'];
        dbDataPoint.otherCharge = dataPoint['Other Charge'];
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
            return this.checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        let totalVolume: number = 0;
        let energyUse: number = 0;
        let totalConsumption: number = dataPoint['Total Consumption'];
        let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit) == false);
        let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
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
        dbDataPoint.totalCost = dataPoint['Total Cost'];
        dbDataPoint.commodityCharge = dataPoint['Commodity Charge'];
        dbDataPoint.deliveryCharge = dataPoint['Delivery Charge'];
        dbDataPoint.otherCharge = dataPoint['Other Charge'];
        dbDataPoint.demandUsage = dataPoint['Demand Usage'];
        dbDataPoint.demandCharge = dataPoint['Demand Charge'];
        dbDataPoint.localSalesTax = dataPoint['Local Sales Tax'];
        dbDataPoint.stateSalesTax = dataPoint['State Sales Tax'];
        dbDataPoint.latePayment = dataPoint['Late Payment'];
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  checkSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCDate() == date2.getUTCDate();
  }

  checkSameMonth(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth();
  }

  getScope(formScope: string): number {
    let scopeOption: ScopeOption = ScopeOptions.find(option => { return (option.scope + ': ' + option.optionLabel) == formScope });
    if (scopeOption) {
      return scopeOption.value;
    } else {
      return undefined
    }
  }

  getYesNoBool(val: string): boolean {
    if (val == 'Yes') {
      return true;
    } else {
      return false;
    }
  }

  getAgreementType(formAgreementType: string): number {
    let agreementType: AgreementType = AgreementTypes.find(type => { return type.typeLabel == formAgreementType });
    if (agreementType) {
      return agreementType.value;
    } else {
      return undefined;
    }
  }

  getMeterFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;

    // facilityGroups.push({
    //   facilityId: Math.random().toString(36).substr(2, 9),
    //   groupItems: [],
    //   facilityName: 'Unmapped Meters',
    //   color: ''
    // })
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


  getPredictorFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, predictorEntries: Array<IdbPredictorEntry> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let predictorIndex: number = 0;

    // facilityGroups.push({
    //   facilityId: Math.random().toString(36).substr(2, 9),
    //   groupItems: [],
    //   facilityName: 'Unmapped Predictors',
    //   color: ''
    // })
    templateData.importFacilities.forEach(facility => {
      let facilityPredictorEntry: IdbPredictorEntry = templateData.predictorEntries.find(entry => { return entry.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      facilityPredictorEntry.predictors.forEach(predictor => {
        groupItems.push({
          index: predictorIndex,
          value: predictor.name,
          id: predictor.id,
        });
        predictorIndex++;
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


  parseMetersFromGroups(fileReference: FileReference): Array<IdbUtilityMeter> {
    let meters: Array<IdbUtilityMeter> = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    // let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    fileReference.meterFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Meters') {
        let facility: IdbFacility = fileReference.importFacilities.find(facility => { return group.facilityId == facility.guid });
        group.groupItems.forEach(groupItem => {
          let meter: IdbUtilityMeter = accountMeters.find(accMeter => { return accMeter.name == groupItem.value && accMeter.facilityId == facility.guid });
          if (!meter) {
            //TODO: parse meter source/units
            meter = this.getNewMeterFromExcelColumn(groupItem, facility);
          }
          meters.push(meter);
        });
      };
    });
    return meters;
  }


  getNewMeterFromExcelColumn(groupItem: ColumnItem, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = this.utilityMeterDbService.getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, selectedFacility.energyUnit);
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
      let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(startingUnit);
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
        newMeter.startingUnit = 'kWh';
        newMeter.energyUnit = 'kWh';
      } else if (newMeter.source == 'Natural Gas') {
        newMeter.scope = 1;
      } else if (newMeter.source == 'Other Energy') {
        newMeter.scope = 4;
      }
      if (newMeter.startingUnit && newMeter.source) {
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(newMeter.startingUnit);
        if (isEnergyUnit) {
          newMeter.energyUnit = newMeter.startingUnit;
        } else {
          newMeter.energyUnit = selectedFacility.energyUnit;
        }
        let showHeatCapacity: boolean = this.editMeterFormService.checkShowHeatCapacity(newMeter.source, newMeter.startingUnit);
        if (showHeatCapacity) {
          newMeter.heatCapacity = this.energyUseCalculationsService.getHeatingCapacity(newMeter.source, newMeter.startingUnit, newMeter.energyUnit);
        }
        let showSiteToSource: boolean = this.editMeterFormService.checkShowSiteToSource(newMeter.source, newMeter.startingUnit, newMeter.includeInEnergy);
        if (showSiteToSource) {
          newMeter.siteToSource = this.energyUseCalculationsService.getSiteToSource(newMeter.source);
        }
      }
    }
    newMeter.name = groupItem.value;
    //use import wizard name so that the name of the meter can be changed but 
    //we can still access the data using this value
    newMeter.importWizardName = groupItem.value;
    //start with random meter number
    newMeter.meterNumber = Math.random().toString(36).substr(2, 9);

    //set emissions mulitpliers
    newMeter = this.editMeterFormService.setMultipliers(newMeter);
    return newMeter;
  }


  parseExcelMeterData(fileReference: FileReference): Array<IdbUtilityMeterData> {
    let dateColumnGroup: ColumnGroup = fileReference.columnGroups.find(group => { return group.groupLabel == 'Date' });
    let dateColumnVal: string = dateColumnGroup.groupItems[0].value;

    let accountUtilityData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();

    let utilityData: Array<IdbUtilityMeterData> = new Array();
    fileReference.meters.forEach(meter => {
      if (!meter.skipImport) {
        fileReference.headerMap.forEach(dataRow => {
          let readDate: Date = new Date(dataRow[dateColumnVal]);
          let dataItem: IdbUtilityMeterData = accountUtilityData.find(accountDataItem => {
            return accountDataItem.facilityId == meter.facilityId && this.checkSameDay(new Date(accountDataItem.readDate), readDate) && accountDataItem.meterId == meter.guid;
          })
          if (!dataItem) {
            dataItem = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
          }
          dataItem.readDate = readDate;
          //TODO: volume energy use math..
          dataItem.totalEnergyUse = dataRow[meter.importWizardName];
          utilityData.push(dataItem);
        });
      }
    });
    return utilityData;
  }


  parseExcelPredictorsData(fileReference: FileReference): Array<IdbPredictorEntry> {
    let dateColumnGroup: ColumnGroup = fileReference.columnGroups.find(group => { return group.groupLabel == 'Date' });
    let dateColumnVal: string = dateColumnGroup.groupItems[0].value;

    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    let predictorData: Array<IdbPredictorEntry> = new Array();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    fileReference.predictorFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Predictors' && group.groupItems.length != 0) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
          return entry.facilityId == group.facilityId;
        });
        fileReference.headerMap.forEach(dataRow => {
          let readDate: Date = new Date(dataRow[dateColumnVal]);
          let predictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
            return this.checkSameMonth(new Date(entry.date), readDate);
          });
          if (!predictorEntry) {
            predictorEntry = this.predictorDbService.getNewIdbPredictorEntry(group.facilityId, selectedAccount.guid, readDate);
          }
          group.groupItems.forEach(item => {
            let entryDataIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.name == item.value });
            if (entryDataIndex != -1) {
              predictorEntry.predictors[entryDataIndex].amount = dataRow[item.value];
            } else {
              let entryData: PredictorData = this.predictorDbService.getNewPredictor([]);
              entryData.name = item.value;
              entryData.amount = dataRow[item.value];
              predictorEntry.predictors.push(entryData);
            }
          });
          predictorData.push(predictorEntry);
        });
      }
    });
    return predictorData;
  }
}


export interface FileReference {
  name: string,
  // type: '.csv' | '.xlsx',
  file: File,
  dataSubmitted: boolean,
  id: string,
  workbook: WorkBook,
  isTemplate: boolean,
  selectedWorksheetName: string,
  selectedWorksheetData: Array<Array<string>>,
  columnGroups: Array<ColumnGroup>,
  meterFacilityGroups: Array<FacilityGroup>,
  predictorFacilityGroups: Array<FacilityGroup>,
  headerMap: Array<any>,
  importFacilities: Array<IdbFacility>,
  meters: Array<IdbUtilityMeter>,
  meterData: Array<IdbUtilityMeterData>,
  predictorEntries: Array<IdbPredictorEntry>,
  skipExistingReadingsMeterIds: Array<string>
  skipExistingPredictorFacilityIds: Array<string>
}

export interface ColumnGroup {
  groupLabel: string,
  groupItems: Array<ColumnItem>,
  id: string
}

export interface FacilityGroup {
  facilityId: string,
  groupItems: Array<ColumnItem>,
  facilityName: string,
  color: string
}

export interface ColumnItem {
  index: number,
  value: string,
  id: string,
  // fileName?: string
}


export interface ParsedTemplate {
  importFacilities: Array<IdbFacility>,
  importMeters: Array<IdbUtilityMeter>,
  predictorEntries: Array<IdbPredictorEntry>,
  meterData: Array<IdbUtilityMeterData>
}
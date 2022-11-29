import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkBook } from 'xlsx';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup, MeterPhase, MeterSource, PredictorData } from '../models/idb';
import * as XLSX from 'xlsx';
import { AgreementType, AgreementTypes, FuelTypeOption, ScopeOption, ScopeOptions, SourceOptions } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from '../shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { EnergyUseCalculationsService } from '../shared/helper-services/energy-use-calculations.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { UnitOption } from '../shared/unitOptions';
import { Countries, Country } from '../shared/form-data/countries';
import { EGridService, SubRegionData } from '../shared/helper-services/e-grid.service';
import * as _ from 'lodash';

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
    private energyUseCalculationsService: EnergyUseCalculationsService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private eGridService: EGridService) {
    this.allFilesSet = new BehaviorSubject<boolean>(false);
    this.fileReferences = new Array();
    this.uploadMeters = new Array();
  }


  getFileReference(file: File, workBook: XLSX.WorkBook): FileReference {
    let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
    if (!isTemplate) {
      let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();

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
        skipExistingPredictorFacilityIds: [],
        newMeterGroups: [],
        selectedFacilityId: undefined
      };
    } else {
      //parse template
      let templateData: ParsedTemplate = this.parseTemplate(workBook);
      // let meterFacilityGroups: Array<FacilityGroup> = this.getMeterFacilityGroups(templateData);
      let predictorFacilityGroups: Array<FacilityGroup> = this.getPredictorFacilityGroups(templateData);
      let fileName: string = 'Upload File';
      if (file) {
        fileName = file.name;
      }
      return {
        name: fileName,
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
        skipExistingPredictorFacilityIds: [],
        newMeterGroups: templateData.newGroups,
        selectedFacilityId: undefined
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
        facility.country = this.getCountryCode(facilityDataRow['Country']);
        facility.state = facilityDataRow['State'];
        facility.city = facilityDataRow['City'];
        facility.zip = facilityDataRow['Zip']?.toString();
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
          if (!meter) {
            meter = this.utilityMeterDbService.getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, facility.energyUnit);
          }

          meter.meterNumber = meterNumber;
          meter.accountNumber = meterData['Account Number'];
          meter.source = this.getMeterSource(meterData['Source']);
          meter.name = meterData['Meter Name'];
          if (!meter.name) {
            meter.name = 'Meter ' + meterNumber;
          }
          meter.supplier = meterData['Utility Supplier'];
          meter.notes = meterData['Notes'];
          meter.location = meterData['Building / Location'];
          let groupData: { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } = this.getMeterGroup(meterData['Meter Group'], facility.guid, newGroups);
          newGroups = groupData.newGroups;
          if (groupData.group) {
            meter.groupId = groupData.group.guid;
          }
          meter.phase = this.getPhase(meterData['Phase']);
          meter.fuel = this.getFuelEnum(meterData['Fuel'], meter.source, meter.phase);
          meter.startingUnit = this.checkImportStartingUnit(meterData['Collection Unit'], meter.source, meter.phase, meter.fuel);
          meter.heatCapacity = meterData['Heat Capacity'];
          let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
          if (isEnergyUnit) {
            meter.energyUnit = meter.startingUnit;
          }
          if (!meter.heatCapacity) {
            if (!isEnergyUnit) {
              let fuelTypeOptions: Array<FuelTypeOption> = this.energyUseCalculationsService.getFuelTypeOptions(meter.source, meter.phase);
              let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
              meter.heatCapacity = this.energyUseCalculationsService.getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit, fuel);
            }
          }
          // meter.heatCapacity = meterData['Heat Capacity'];
          meter.siteToSource = meterData['Site To Source'];
          meter.scope = this.getScope(meterData['Scope']);
          if (meter.scope == undefined) {
            meter.scope = this.editMeterFormService.getDefaultScope(meter.source);
          }
          meter.agreementType = this.getAgreementType(meterData['Agreement Type']);
          if (meter.agreementType == undefined && meter.source == 'Electricity') {
            meter.agreementType = 1;
          }
          meter.includeInEnergy = this.getYesNoBool(meterData['Include In Energy']);
          if (meter.includeInEnergy == undefined) {
            if (meter.agreementType != 4 && meter.agreementType != 6) {
              meter.includeInEnergy = true;
            } else {
              meter.includeInEnergy = false;
            }
          }
          meter.retainRECs = this.getYesNoBool(meterData['Retain RECS']);
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
              let fuelTypeOptions: Array<FuelTypeOption> = this.energyUseCalculationsService.getFuelTypeOptions(meter.source, meter.phase);
              selectedFuelTypeOption = fuelTypeOptions.find(option => { return option.value == meter.fuel });
            }
            let siteToSource: number = this.energyUseCalculationsService.getSiteToSource(meter.source, selectedFuelTypeOption, meter.agreementType);
            meter.siteToSource = siteToSource;
          }
          meter.meterReadingDataApplication = this.getMeterReadingDataApplication(meterData['Calendarize Data?']);

          meter = this.editMeterFormService.setMultipliers(meter);
          importMeters.push(meter);
        }
      }
    })
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = this.getMeterDataEntries(workbook, importMeters);
    //predictors

    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    // debugger
    let predictorEntries: Array<IdbPredictorEntry> = new Array();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.getAccountPerdictorsCopy();
    importFacilities.forEach(facility => {
      let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
      let existingFacilityPredictorData: Array<PredictorData> = new Array();
      if (facilityPredictorEntries.length != 0) {
        existingFacilityPredictorData = facilityPredictorEntries[0].predictors;
      }
      if (facilityPredictorData.length != 0) {
        Object.keys(facilityPredictorData[0]).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictorIndex: number = existingFacilityPredictorData.findIndex(predictor => { return predictor.name == key });
            if (predictorIndex == -1) {
              let hasData: boolean = false;
              facilityPredictorData.forEach(dataItem => {
                if (dataItem[key] != 0) {
                  hasData = true;
                }
              });
              if (hasData) {
                let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
                let nameTest: string = key.toLocaleLowerCase();
                if (!nameTest.includes('cdd') && !nameTest.includes('hdd')) {
                  newPredictor.production = true;
                }
                newPredictor.name = key;
                existingFacilityPredictorData.push(newPredictor);
              }
            }
          }
        });
      }
      facilityPredictorData.forEach(dataItem => {
        let dataItemDate: Date = new Date(dataItem['Date']);
        let facilityPredictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
          return this.checkSameMonth(dataItemDate, new Date(entry.date))
        });
        if (!facilityPredictorEntry) {
          facilityPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, dataItemDate);
          facilityPredictorEntry.predictors = JSON.parse(JSON.stringify(existingFacilityPredictorData));
        }
        Object.keys(dataItem).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictorIndex: number = facilityPredictorEntry.predictors.findIndex(predictor => { return predictor.name == key });
            if (predictorIndex != -1) {
              facilityPredictorEntry.predictors[predictorIndex].amount = dataItem[key];
            }
          }
        });
        if (facilityPredictorEntry.predictors.length != 0) {
          predictorEntries.push(facilityPredictorEntry);
        }
      });
    })
    return { importFacilities: importFacilities, importMeters: importMeters, predictorEntries: predictorEntries, meterData: importMeterData, newGroups: newGroups }
  }


  getMeterGroup(groupName: string, facilityId: string, newGroups: Array<IdbUtilityMeterGroup>): { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } {
    let accountGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getAccountMeterGroupsCopy();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(accountGroup => { return accountGroup.facilityId == facilityId });
    let dbGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.name == groupName || group.guid == groupName });
    if (dbGroup) {
      return { group: dbGroup, newGroups: newGroups }
    } else {
      let newFacilityGroups: Array<IdbUtilityMeterGroup> = newGroups.filter(group => { return group.facilityId == facilityId });
      dbGroup = newFacilityGroups.find(newGroup => { return newGroup.name == groupName });
      if (dbGroup) {
        return { group: dbGroup, newGroups: newGroups }
      } else if (groupName) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        dbGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }

  getPhase(phase: string): MeterPhase {
    if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
      return phase;
    }
    return undefined;
  }

  getFuelEnum(fuel: string, source: MeterSource, phase: MeterPhase): string {
    let fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(source, phase);
    let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
    if (selectedEnergyOption) {
      return selectedEnergyOption.value;
    }
    return undefined;
  }

  getMeterSource(source: string): MeterSource {
    let selectedSource: MeterSource = SourceOptions.find(sourceOption => { return sourceOption == source });
    return selectedSource;
  }

  getCountryCode(country: string): string {
    if (country) {
      let findCountry: Country = Countries.find(countryOption => { return countryOption.name == country });
      if (findCountry) {
        return findCountry.code
      }
    }
    return;
  }

  getMeterReadingDataApplication(yesOrNo: 'Yes' | 'No'): 'backward' | 'fullMonth' {
    if (yesOrNo == 'Yes') {
      return 'backward'
    } else if ('No') {
      return 'fullMonth';
    } else {
      return;
    }
  }

  getMeterDataEntries(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity']);
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getAccountMeterDataCopy();
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
    } else if (val == 'No') {
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
      if (facilityPredictorEntry) {
        facilityPredictorEntry.predictors.forEach(predictor => {
          groupItems.push({
            index: predictorIndex,
            value: predictor.name,
            id: predictor.id,
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
        if (newMeter.startingUnit == undefined || this.energyUnitsHelperService.isEnergyUnit(newMeter.startingUnit) == false) {
          newMeter.startingUnit = 'kWh';
          newMeter.energyUnit = 'kWh';
        }
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

    let accountUtilityData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getAccountMeterDataCopy();

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

          let totalVolume: number = 0;
          let energyUse: number = 0;
          let totalConsumption: number = dataRow[meter.importWizardName];
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
          dataItem.totalEnergyUse = energyUse;
          dataItem.totalImportConsumption = totalConsumption;
          dataItem.totalVolume = totalVolume;
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
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.getAccountPerdictorsCopy();
    fileReference.predictorFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Predictors' && group.groupItems.length != 0) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
          return entry.facilityId == group.facilityId;
        });
        let existingFacilityPredictorData: Array<PredictorData> = new Array();
        if (facilityPredictorEntries.length != 0) {
          existingFacilityPredictorData = facilityPredictorEntries[0].predictors;
        }
        if (group.groupItems.length != 0) {
          group.groupItems.forEach((predictorItem) => {
            let predictorIndex: number = existingFacilityPredictorData.findIndex(predictor => { return predictor.name == predictorItem.value });
            if (predictorIndex == -1) {
              let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
              newPredictor.name = predictorItem.value;
              existingFacilityPredictorData.push(newPredictor);
            }
          });
        }
        fileReference.headerMap.forEach(dataRow => {
          let readDate: Date = new Date(dataRow[dateColumnVal]);
          let predictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
            return this.checkSameMonth(new Date(entry.date), readDate);
          });
          if (!predictorEntry) {
            predictorEntry = this.predictorDbService.getNewIdbPredictorEntry(group.facilityId, selectedAccount.guid, readDate);
            predictorEntry.predictors = JSON.parse(JSON.stringify(existingFacilityPredictorData));
          }
          group.groupItems.forEach(item => {

            let entryDataIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.name == item.value });
            if (entryDataIndex != -1) {
              predictorEntry.predictors[entryDataIndex].amount = dataRow[item.value];
            }
          });
          predictorData.push(predictorEntry);
        });
      }
    });
    return predictorData;
  }


  updateProductionPredictorData(fileReference: FileReference): Array<IdbPredictorEntry> {
    fileReference.predictorFacilityGroups.forEach(group => {
      let facilityPredictorEntries: Array<IdbPredictorEntry> = fileReference.predictorEntries.filter(entry => { return entry.facilityId == group.facilityId });
      group.groupItems.forEach(groupItem => {
        facilityPredictorEntries.forEach(predictorEntry => {
          predictorEntry.predictors.forEach(predictor => {
            if (predictor.name == groupItem.value) {
              predictor.production = groupItem.isProductionPredictor;
              predictor.productionInAnalysis = groupItem.isProductionPredictor;
            }
          })
        })
      })
    });
    return fileReference.predictorEntries;
  }

  checkImportStartingUnit(importUnit: string, source: MeterSource, phase: MeterPhase, fuel: string): string {
    if (source) {
      let startingUnitOptions: Array<UnitOption> = this.energyUnitsHelperService.getStartingUnitOptions(source, phase, fuel);
      let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
      if (selectedUnitOption) {
        return selectedUnitOption.value;
      }
    }
    return undefined;
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
  skipExistingPredictorFacilityIds: Array<string>,
  newMeterGroups: Array<IdbUtilityMeterGroup>,
  selectedFacilityId: string
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
  isProductionPredictor?: boolean,
  isExisting?: boolean
  // fileName?: string
}


export interface ParsedTemplate {
  importFacilities: Array<IdbFacility>,
  importMeters: Array<IdbUtilityMeter>,
  predictorEntries: Array<IdbPredictorEntry>,
  meterData: Array<IdbUtilityMeterData>,
  newGroups: Array<IdbUtilityMeterGroup>
}
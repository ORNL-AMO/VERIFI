import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColumnItem, FacilityGroup, FileReference, UploadDataService } from '../upload-data.service';
import * as XLSX from 'xlsx';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AgreementType, AgreementTypes, ScopeOption, ScopeOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  fileReferences: Array<FileReference>;
  disableImport: boolean = false;
  filesUploaded: boolean = false;
  constructor(private router: Router, private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();
  }

  setImportFile(files: FileList) {
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {

            this.addFile(files[index]);
          }
        }
      }
    }
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
  }

  continue() {
    this.uploadDataService.fileReferences = this.fileReferences;
    if (this.fileReferences[0].isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id + '/template-facilities');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id);
    }
  }

  addFile(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      console.log(workBook)
      let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
      if (!isTemplate) {
        this.fileReferences.push({
          name: file.name,
          file: file,
          dataSet: false,
          id: Math.random().toString(36).substr(2, 9),
          workbook: workBook,
          isTemplate: isTemplate,
          selectedWorksheetName: workBook.Workbook.Sheets[0].name,
          selectedWorksheetData: [],
          columnGroups: [],
          meterFacilityGroups: [],
          predictorFacilityGroups: [],
          headerMap: [],
          importFacilities: [],
          meters: [],
          meterData: [],
          predictorEntries: []
        });
      } else {
        //parse template
        let templateData: ParsedTemplate = this.parseTemplate(workBook);
        // let meterFacilityGroups: Array<FacilityGroup> = this.getMeterFacilityGroups(templateData);
        // let predictorFacilityGroups: Array<FacilityGroup> = this.getPredictorFacilityGroups(templateData);
        this.fileReferences.push({
          name: file.name,
          file: file,
          dataSet: false,
          id: Math.random().toString(36).substr(2, 9),
          workbook: workBook,
          isTemplate: isTemplate,
          selectedWorksheetName: undefined,
          selectedWorksheetData: [],
          columnGroups: [],
          meterFacilityGroups: [],
          predictorFacilityGroups: [],
          headerMap: [],
          importFacilities: templateData.importFacilities,
          meters: templateData.importMeters,
          meterData: templateData.meterData,
          predictorEntries: templateData.predictorEntries
        });
      }
    };
    reader.readAsBinaryString(file);
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
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
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
          facilityPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, new Date());
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






      // let facilityPredictorEntry: IdbPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, new Date());

      // console.log(facility.name)
      // console.log(facilityPredictorData);
      // console.log('===');
      // if (facilityPredictorData.length != 0) {
      //   Object.keys(facilityPredictorData[0]).forEach((key) => {
      //     if (key != 'Facility Name' && key != 'Date') {
      //       let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
      //       newPredictor.name = key;
      //       facilityPredictorEntry.predictors.push(newPredictor);
      //     }
      //   });
      //   if (facilityPredictorEntry.predictors.length != 0) {
      //     predictorEntries.push(facilityPredictorEntry);
      //   }
      // }
    })
    return { importFacilities: importFacilities, importMeters: importMeters, predictorEntries: predictorEntries, meterData: importMeterData }
  }

  checkSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCDate() == date2.getUTCDate();
  }

  checkSameMonth(date1: Date, date2: Date): boolean {
    // console.log('date1: ' + date1);
    // console.log('date2: ' + date2);
    // console.log('====');
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
}



export interface ParsedTemplate {
  importFacilities: Array<IdbFacility>,
  importMeters: Array<IdbUtilityMeter>,
  predictorEntries: Array<IdbPredictorEntry>,
  meterData: Array<IdbUtilityMeterData>
}
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
@Component({
  selector: 'app-import-meter-data-wizard',
  templateUrl: './import-meter-data-wizard.component.html',
  styleUrls: ['./import-meter-data-wizard.component.css']
})
export class ImportMeterDataWizardComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  importError: boolean;
  importMeterDataFileType: string;

  allImportDataLines: Array<Array<string>>;
  invalidReadings: Array<{ lineNumber: number, errors: Array<string> }>;
  validNewReadings: Array<IdbUtilityMeterData>;
  validExistingReadings: Array<IdbUtilityMeterData>;
  existingData: Array<{ meterName: string, numberOfEntries: number, startDate: Date, endDate: Date }>;
  newData: Array<{ meterName: string, numberOfEntries: number, startDate: Date, endDate: Date }>;

  missingMeterNumberLineNumbers: Array<number>;
  missingMeterNumberBounds: Array<{ start: number, end: number, selectedMeter: IdbUtilityMeter }>;

  invalidMeterTypesLineNumbers: Array<number>;
  invalidMeterTypeBounds: Array<{ start: number, end: number, selectedMeter: IdbUtilityMeter }>;

  uniqNewAndExistingEntries: Array<{ readingData: IdbUtilityMeterData, meterDataForm: FormGroup, idbMeter: IdbUtilityMeter, lineNumber: number }>;

  duplicateEntries: Array<{ date: Date, idbMeter: IdbUtilityMeter, lineNumbers: Array<number> }>;


  facilityMeters: Array<IdbUtilityMeter>;
  selectedTab: string = 'valid';
  importDataExists: boolean;
  skipExisting: boolean = false;
  inputFile: any;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private loadingService: LoadingService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.initializeArrays();
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
  }

  meterDataImport(files: FileList) {
    this.initializeArrays();
    if (files && files.length > 0) {
      let file: File = files.item(0);
      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        let lines: Array<string> = csv.split("\n");
        let headers: Array<string> = lines[0].replace('\r', '').split(",");
        let electricityHeaders: Array<string> = ["Meter Number", "Read Date", "Total Energy", "Total Demand", "Total Cost", "Basic Charge", "Supply Block Amount", "Supply Block Charge", "Flat Rate Amount", "Flat Rate Charge", "Peak Amount", "Peak Charge", "Off Peak Amount", "Off Peak Charge", "Demand Block Amount", "Demand Block Charge", "Generation and Transmission Charge", "Delivery Charge", "Transmission Charge", "Power Factor Charge", "Local Business Charge", "Local Utility Tax", "Late Payment", "Other Charge"];
        let nonElectricityHeaders: Array<string> = ["Meter Number", "Read Date", "Total Consumption", "Total Cost", "Commodity Charge", "Delivery Charge", "Other Charge"];
        if (JSON.stringify(headers) === JSON.stringify(electricityHeaders)) {
          this.importMeterDataFileType = 'Electricity';
          this.importError = false;
          this.parseImportCsvData(lines);
          this.importDataExists = true;
        } else if (JSON.stringify(headers) === JSON.stringify(nonElectricityHeaders)) {
          this.importMeterDataFileType = 'Non Electricity';
          this.importError = false;
          this.parseImportCsvData(lines);
          this.importDataExists = true;
        } else {
          this.importDataExists = false;
          this.importError = true;
        }
      }
    }
  }

  initializeArrays() {
    this.allImportDataLines = new Array();
    this.invalidReadings = new Array();
    this.validExistingReadings = new Array();
    this.missingMeterNumberLineNumbers = new Array();
    this.validNewReadings = new Array();
    this.invalidMeterTypesLineNumbers = new Array();
    this.duplicateEntries = new Array();
    this.uniqNewAndExistingEntries = new Array();
  }

  parseImportCsvData(lines: Array<string>) {
    for (var i = 1; i < lines.length; i++) {
      let currentLine: Array<string> = lines[i].split(",").map(value => {
        if (!value || value == '' || value.length == 0) {
          return null;
        } else {
          let lineItemCopy = JSON.parse(JSON.stringify(value));
          let test = lineItemCopy.replace(/\s/g, '');
          if (test.length != 0) {
            return value;
          } else {
            return null;
          }
        }
      });
      let lineHasData: string = currentLine.find(lineItem => {
        return lineItem != null;
      });
      if (lineHasData) {
        this.allImportDataLines.push(currentLine);
        this.parseMeterReading(currentLine, i);
      }
    }
    this.checkDuplicateEntries();
    this.splitExistingAndNewReadings();
    this.setMissingMeterDataBounds();
    this.setInvalidMeterTypeBounds();
    this.setExistingData();
    this.setNewData();
  }

  parseMeterReading(currentLine: Array<string>, lineNumber: number) {
    //currentLine[0] = Meter Number in .csv
    //find corresponding meter
    let idbMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.meterNumber == currentLine[0] });
    if (idbMeter) {
      if ((idbMeter.source == 'Electricity' && this.importMeterDataFileType != 'Electricity') || (idbMeter.source != 'Electricity' && this.importMeterDataFileType == 'Electricity')) {
        //import meter number source doesn't match file type
        this.invalidMeterTypesLineNumbers.push(lineNumber);
      } else {
        this.setupAndAddMeterReading(currentLine, idbMeter, lineNumber);
      }
    } else {
      //no meter exists matching meter number
      this.missingMeterNumberLineNumbers.push(lineNumber);
    }
  }

  setupAndAddMeterReading(currentLine: Array<string>, idbMeter: IdbUtilityMeter, lineNumber: number) {
    //meter exists matching meter number
    if (idbMeter.source == 'Electricity') {
      //importing electricity data
      let electricityMeterDataObj: IdbUtilityMeterData = this.getElectricityMeterDataObject(idbMeter, currentLine);
      let meterDataForm: FormGroup = this.utilityMeterDataService.getElectricityMeterDataForm(electricityMeterDataObj);
      if (meterDataForm.valid) {
        this.addMeterReading(electricityMeterDataObj, meterDataForm, idbMeter, lineNumber);
      } else {
        this.addInvalidReading(meterDataForm, lineNumber);
      }

    } else if (idbMeter.source != 'Electricity') {
      //importing non electricity data
      let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(idbMeter.startingUnit) == false);
      let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(idbMeter.source);
      let nonElectricityMeterDataObj: IdbUtilityMeterData = this.getOtherSourceMeterDataObject(idbMeter, currentLine, displayVolumeInput, displayEnergyUse);
      let meterDataForm: FormGroup = this.utilityMeterDataService.getGeneralMeterDataForm(nonElectricityMeterDataObj, displayVolumeInput, displayEnergyUse);
      if (meterDataForm.valid) {
        this.addMeterReading(nonElectricityMeterDataObj, meterDataForm, idbMeter, lineNumber);
      } else {
        this.addInvalidReading(meterDataForm, lineNumber);
      }
    }
  }

  addMeterReading(readingData: IdbUtilityMeterData, meterDataForm: FormGroup, idbMeter: IdbUtilityMeter, lineNumber: number) {
    this.uniqNewAndExistingEntries.push({ readingData: readingData, meterDataForm: meterDataForm, idbMeter: idbMeter, lineNumber: lineNumber });
  }


  splitExistingAndNewReadings() {
    this.validExistingReadings = new Array();
    this.validNewReadings = new Array();
    this.uniqNewAndExistingEntries.forEach(entry => {
      //check reading exists for month/year (update vs add)
      let existingReadingForMonth: IdbUtilityMeterData = this.utilityMeterDataDbService.checkMeterReadingExistForDate(entry.readingData.readDate, entry.idbMeter);
      if (existingReadingForMonth) {
        let updatedReading: IdbUtilityMeterData;
        if (entry.idbMeter.source == 'Electricity') {
          updatedReading = this.utilityMeterDataService.updateElectricityMeterDataFromForm(existingReadingForMonth, entry.meterDataForm);
        } else {
          updatedReading = this.utilityMeterDataService.updateGeneralMeterDataFromForm(existingReadingForMonth, entry.meterDataForm);
        }
        this.validExistingReadings.push(updatedReading);
      } else {
        this.validNewReadings.push(entry.readingData);
      }
    })
  }

  addInvalidReading(form: FormGroup, lineNumber: number) {
    this.invalidReadings.push({
      lineNumber: lineNumber,
      errors: this.getErrorsFromForm(form)
    });
  }

  getErrorsFromForm(form: FormGroup): Array<string> {
    let errors: Array<string> = new Array();
    //read date
    if (form.controls.readDate.errors) {
      errors.push('Read Date Missing');
    }
    //total cost
    if (form.controls.totalCost.errors) {
      if (form.controls.totalCost.errors.min) {
        errors.push('Total Cost Less Than 0');
      }
      if (form.controls.totalCost.errors.required) {
        errors.push('Total Cost Missing');
      }
    }
    //total demand
    if (form.controls.totalDemand && form.controls.totalDemand.errors) {
      if (form.controls.totalDemand.errors.min) {
        errors.push('Total Demand Less Than 0');
      }
      if (form.controls.totalDemand.errors.required) {
        errors.push('Total Demand Missing');
      }
    }
    //totalEnergyUse
    if (form.controls.totalEnergyUse && form.controls.totalEnergyUse.errors) {
      if (form.controls.totalEnergyUse.errors.min) {
        errors.push('Total Energy Use Less Than 0');
      }
      if (form.controls.totalEnergyUse.errors.required) {
        errors.push('Total Energy Use Missing');
      }
    }
    //total consumption
    if (form.controls.totalVolume && form.controls.totalVolume.errors) {
      if (form.controls.totalVolume.errors.min) {
        errors.push('Total Consumption Less Than 0');
      }
      if (form.controls.totalVolume.errors.required) {
        errors.push('Total Consumption Missing');
      }
    }
    return errors;
  }

  getElectricityMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter);
    obj.readDate = this.getDate(currentLine[1]);
    obj.totalEnergyUse = this.getNumberValue(currentLine[2]);
    obj.totalDemand = this.getNumberValue(currentLine[3]);
    obj.totalCost = this.getNumberValue(currentLine[4]);
    obj.basicCharge = this.getNumberValue(currentLine[5]);
    obj.supplyBlockAmount = this.getNumberValue(currentLine[6]);
    obj.supplyBlockCharge = this.getNumberValue(currentLine[7]);
    obj.flatRateAmount = this.getNumberValue(currentLine[8]);
    obj.flatRateCharge = this.getNumberValue(currentLine[9]);
    obj.peakAmount = this.getNumberValue(currentLine[10]);
    obj.peakCharge = this.getNumberValue(currentLine[11]);
    obj.offPeakAmount = this.getNumberValue(currentLine[12]);
    obj.offPeakCharge = this.getNumberValue(currentLine[13]);
    obj.demandBlockAmount = this.getNumberValue(currentLine[14]);
    obj.demandBlockCharge = this.getNumberValue(currentLine[15]);
    obj.generationTransmissionCharge = this.getNumberValue(currentLine[16]);
    obj.deliveryCharge = this.getNumberValue(currentLine[17]);
    obj.transmissionCharge = this.getNumberValue(currentLine[18]);
    obj.powerFactorCharge = this.getNumberValue(currentLine[19]);
    obj.businessCharge = this.getNumberValue(currentLine[20]);
    obj.utilityTax = this.getNumberValue(currentLine[21]);
    obj.latePayment = this.getNumberValue(currentLine[22]);
    obj.otherCharge = this.getNumberValue(currentLine[23]);
    return obj;
  }

  getNumberValue(value: string): number {
    if (value) {
      return Number(value)
    } else {
      return undefined;
    }
  }

  getOtherSourceMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>, displayVolumeInput: boolean, displayEnergyUse: boolean): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter);
    obj.readDate = this.getDate(currentLine[1]);
    if (!displayVolumeInput) {
      obj.totalEnergyUse = this.getNumberValue(currentLine[2]);
    } else {
      obj.totalVolume = this.getNumberValue(currentLine[2]);
      if (displayEnergyUse && obj.totalVolume) {
        obj.totalEnergyUse = obj.totalVolume * idbMeter.heatCapacity;
      }
    }
    obj.totalCost = this.getNumberValue(currentLine[3]);
    obj.commodityCharge = this.getNumberValue(currentLine[4]);
    obj.deliveryCharge = this.getNumberValue(currentLine[5]);
    obj.otherCharge = this.getNumberValue(currentLine[6]);
    return obj;
  }

  getDate(csvDate: string): Date {
    if (csvDate) {
      return new Date(csvDate)
    } else {
      return undefined;
    }
  }

  close() {
    this.emitClose.emit(true);
  }

  setTab(str: string) {
    this.selectedTab = str;
  }

  setMissingMeterDataBounds() {
    this.missingMeterNumberBounds = new Array();
    let start: number = this.missingMeterNumberLineNumbers[0];
    for (let i = 0; i < this.missingMeterNumberLineNumbers.length; i++) {
      if ((this.missingMeterNumberLineNumbers[i] + 1) != this.missingMeterNumberLineNumbers[i + 1]) {
        this.missingMeterNumberBounds.push({ start: start, end: this.missingMeterNumberLineNumbers[i], selectedMeter: undefined });
        start = this.missingMeterNumberLineNumbers[i + 1];
      }
    }
  }

  setInvalidMeterTypeBounds() {
    this.invalidMeterTypeBounds = new Array();
    let start: number = this.invalidMeterTypesLineNumbers[0];
    for (let i = 0; i < this.invalidMeterTypesLineNumbers.length; i++) {
      if ((this.invalidMeterTypesLineNumbers[i] + 1) != this.invalidMeterTypesLineNumbers[i + 1]) {
        this.invalidMeterTypeBounds.push({ start: start, end: this.invalidMeterTypesLineNumbers[i], selectedMeter: undefined });
        start = this.invalidMeterTypesLineNumbers[i + 1];
      }
    }
  }

  submitMissingMeterNumberUpdates() {
    this.missingMeterNumberBounds.forEach(boundItem => {
      if (boundItem.selectedMeter != undefined) {
        for (let i = boundItem.start - 1; i < boundItem.end; i++) {
          let currentLine: Array<string> = this.allImportDataLines[i];
          this.setupAndAddMeterReading(currentLine, boundItem.selectedMeter, i);
          let indexOfMissingNumber: number = this.missingMeterNumberLineNumbers.indexOf(i + 1);
          if (indexOfMissingNumber > -1) {
            this.missingMeterNumberLineNumbers.splice(indexOfMissingNumber);
          }
        }
      }
    });
    this.checkDuplicateEntries();
    this.splitExistingAndNewReadings();
    this.setMissingMeterDataBounds();
    this.setExistingData();
    this.setNewData();
    this.setTab('valid');
  }

  setExistingData() {
    this.existingData = new Array();
    let counts = _.countBy(this.validExistingReadings, 'meterId');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == Number(key) })
      let meterData: Array<IdbUtilityMeterData> = this.validExistingReadings.filter(reading => { return reading.meterId == meter.id });
      let startDate: IdbUtilityMeterData = _.minBy(meterData, 'readDate');
      let endDate: IdbUtilityMeterData = _.maxBy(meterData, 'readDate');
      this.existingData.push({
        meterName: meter.name,
        numberOfEntries: counts[key],
        startDate: new Date(startDate.readDate),
        endDate: new Date(endDate.readDate)
      });
    });
  }

  setNewData() {
    this.newData = new Array();
    let counts = _.countBy(this.validNewReadings, 'meterId');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == Number(key) })
      let meterData: Array<IdbUtilityMeterData> = this.validNewReadings.filter(reading => { return reading.meterId == meter.id });
      let startDate: IdbUtilityMeterData = _.minBy(meterData, 'readDate');
      let endDate: IdbUtilityMeterData = _.maxBy(meterData, 'readDate');
      this.newData.push({
        meterName: meter.name,
        numberOfEntries: counts[key],
        startDate: new Date(startDate.readDate),
        endDate: new Date(endDate.readDate)
      });
    });
  }

  toggleSkipExisting() {
    this.skipExisting = !this.skipExisting;
  }

  async runImport() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Importing Meter Data...");
    await this.validNewReadings.forEach((importMeterData: IdbUtilityMeterData) => {
      this.utilityMeterDataDbService.addWithObservable(importMeterData);
    });
    if (!this.skipExisting) {
      await this.validExistingReadings.forEach((importMeterData: IdbUtilityMeterData) => {
        this.utilityMeterDataDbService.updateWithObservable(importMeterData);
      });
    }
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.utilityMeterDataDbService.getAllByIndexRange('facilityId', facility.id).subscribe(meterData => {
      this.utilityMeterDataDbService.facilityMeterData.next(meterData);
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.utilityMeterDataDbService.getAllByIndexRange('accountId', account.id).subscribe(meterData => {
        this.utilityMeterDataDbService.accountMeterData.next(meterData);
        this.loadingService.setLoadingStatus(false);
        this.close();
      });
    });
  }

  checkDuplicateEntries() {
    let duplicateEntries: Array<{ readingData: IdbUtilityMeterData, meterDataForm: FormGroup, idbMeter: IdbUtilityMeter, lineNumber: number }> = new Array();

    this.uniqNewAndExistingEntries = this.uniqNewAndExistingEntries.filter((existingReading, index) => {
      let duplicates = this.uniqNewAndExistingEntries.filter((entry) => {
        return (this.utilityMeterDataDbService.checkSameMonthYear(new Date(entry.readingData.readDate), existingReading.readingData) && existingReading.idbMeter.id == entry.idbMeter.id);
      });
      if (duplicates.length > 1) {
        duplicateEntries.push(existingReading);
      }
      if (duplicates.length == 1) {
        return true;
      }
    });


    this.duplicateEntries = new Array();
    duplicateEntries.forEach(entry => {
      let checkExistIndex: number = this.duplicateEntries.findIndex(duplicateEntry => {
        return (this.utilityMeterDataDbService.checkSameMonthYear(new Date(duplicateEntry.date), entry.readingData) && duplicateEntry.idbMeter.id == entry.idbMeter.id);
      });
      if (checkExistIndex > -1) {
        this.duplicateEntries[checkExistIndex].lineNumbers.push(entry.lineNumber);
      } else {
        this.duplicateEntries.push({
          date: new Date(entry.readingData.readDate),
          idbMeter: entry.idbMeter,
          lineNumbers: [entry.lineNumber]
        });
      }
    });
  }

  reset() {
    this.inputFile = undefined;
    this.importError = undefined;
    this.importDataExists = false;
    this.initializeArrays();
  }
}

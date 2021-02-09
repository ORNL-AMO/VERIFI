import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';
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

  facilityMeters: Array<IdbUtilityMeter>;
  selectedTab: string = 'valid';
  importDataExists: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
  }

  meterDataImport(files: FileList) {
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
          this.initializeArrays();
          this.importError = false;
          this.parseImportCsvData(lines);
          this.importDataExists = true;
        } else if (JSON.stringify(headers) === JSON.stringify(nonElectricityHeaders)) {
          this.importMeterDataFileType = 'Non Electricity';
          this.initializeArrays();
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
      if (idbMeter.source == 'Electricity' && this.importMeterDataFileType != 'Electricity' || idbMeter.source == 'Electricity' && this.importMeterDataFileType == 'Electricity') {
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
        this.addMeterReading(electricityMeterDataObj, meterDataForm, idbMeter);
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
        this.addMeterReading(nonElectricityMeterDataObj, meterDataForm, idbMeter);
      } else {
        this.addInvalidReading(meterDataForm, lineNumber);
      }
    }
  }

  addMeterReading(readingData: IdbUtilityMeterData, meterDataForm: FormGroup, idbMeter: IdbUtilityMeter) {
    //check reading exists for month/year (update vs add)
    let existingReadingForMonth: IdbUtilityMeterData = this.utilityMeterDataDbService.checkMeterReadingExistForDate(readingData.readDate, idbMeter);
    if (existingReadingForMonth) {
      let updatedReading: IdbUtilityMeterData;
      if (idbMeter.source == 'Electricity') {
        updatedReading = this.utilityMeterDataService.updateElectricityMeterDataFromForm(existingReadingForMonth, meterDataForm);
      } else {
        updatedReading = this.utilityMeterDataService.updateGeneralMeterDataFromForm(existingReadingForMonth, meterDataForm);
      }
      this.validExistingReadings.push(updatedReading);
    } else {
      this.validNewReadings.push(readingData);
    }
  }

  addInvalidReading(form: FormGroup, lineNumber: number) {
    this.invalidReadings.push({
      lineNumber: lineNumber,
      errors: this.getErrorsFromForm(form)
    });
  }

  getErrorsFromForm(form:FormGroup): Array<string> {
    let errors: Array<string> = new Array();
    //read date
    if(form.controls.readDate.errors){
      errors.push('Read Date Missing');
    }
    //total cost
    if(form.controls.totalCost.errors){
      if(form.controls.totalCost.errors.min){
        errors.push('Total Cost Less Than 0');
      }
      if(form.controls.totalCost.errors.required){
        errors.push('Total Cost Missing');
      }
    }
    //total demand
    if(form.controls.totalDemand && form.controls.totalDemand.errors){
      if(form.controls.totalDemand.errors.min){
        errors.push('Total Demand Less Than 0');
      }
      if(form.controls.totalDemand.errors.required){
        errors.push('Total Demand Missing');
      }
    }
    //totalEnergyUse
    if(form.controls.totalEnergyUse && form.controls.totalEnergyUse.errors){
      if(form.controls.totalEnergyUse.errors.min){
        errors.push('Total Energy Use Less Than 0');
      }
      if(form.controls.totalEnergyUse.errors.required){
        errors.push('Total Energy Use Missing');
      }
    }
    //total consumption
    if(form.controls.totalVolume && form.controls.totalVolume.errors){
      if(form.controls.totalVolume.errors.min){
        errors.push('Total Consumption Less Than 0');
      }
      if(form.controls.totalVolume.errors.required){
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
    this.setMissingMeterDataBounds();
    this.setExistingData();
    this.setNewData();
    if (this.missingMeterNumberLineNumbers.length == 0) {
      if (this.validExistingReadings.length != 0) {
        this.setTab('valid');
      } else {
        this.setTab('existing');
      }
    }
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
}

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';

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

  invalidReadings: Array<any>;
  validNewReadings: Array<any>;
  validExistingReadings: Array<any>;
  missingMeterNumberLineNumbers: Array<any>;

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
    this.invalidReadings = new Array();
    this.validExistingReadings = new Array();
    this.missingMeterNumberLineNumbers = new Array();
    this.validNewReadings = new Array();
  }

  parseImportCsvData(lines: Array<string>) {
    for (var i = 1; i < lines.length; i++) {
      let currentLine: Array<string> = lines[i].split(",");
      this.parseMeterReading(currentLine, i);
    }
  }

  parseMeterReading(currentLine: Array<string>, lineNumber: number) {
    //currentLine[0] = Meter Number in .csv
    //find corresponding meter
    let idbMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.meterNumber == currentLine[0] });
    if (idbMeter) {
      //meter exists matching meter number
      if (idbMeter.source == 'Electricity' && this.importMeterDataFileType == 'Electricity') {
        //importing electricity data
        let electricityMeterDataObj: IdbUtilityMeterData = this.getElectricityMeterDataObject(idbMeter, currentLine);
        let meterDataForm: FormGroup = this.utilityMeterDataService.getElectricityMeterDataForm(electricityMeterDataObj);
        this.addMeterReading(electricityMeterDataObj, meterDataForm, idbMeter);

      } else if (idbMeter.source != 'Electricity' && this.importMeterDataFileType != 'Electricity') {
        //importing non electricity data
        let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(idbMeter.startingUnit) == false);
        let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(idbMeter.source);
        let nonElectricityMeterDataObj: IdbUtilityMeterData = this.getOtherSourceMeterDataObject(idbMeter, currentLine, displayVolumeInput, displayEnergyUse);
        let meterDataForm: FormGroup = this.utilityMeterDataService.getGeneralMeterDataForm(nonElectricityMeterDataObj, displayVolumeInput, displayEnergyUse);
        this.addMeterReading(nonElectricityMeterDataObj, meterDataForm, idbMeter);

      } else {
        //electricity or non-elecricity data being imported with incorrect data file

      }
    } else {
      //no meter exists matching meter number
      this.missingMeterNumberLineNumbers.push(lineNumber);
    }
  }

  addMeterReading(readingData: IdbUtilityMeterData, meterDataForm: FormGroup, idbMeter: IdbUtilityMeter) {
    if (meterDataForm.invalid) {
      this.invalidReadings.push(readingData);
    } else {
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
  }

  getElectricityMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter);
    obj.readDate = new Date(currentLine[1]);
    obj.totalEnergyUse = Number(currentLine[2]);
    obj.totalDemand = Number(currentLine[3]);
    obj.totalCost = Number(currentLine[4]);
    obj.basicCharge = Number(currentLine[5]);
    obj.supplyBlockAmount = Number(currentLine[6]);
    obj.supplyBlockCharge = Number(currentLine[7]);
    obj.flatRateAmount = Number(currentLine[8]);
    obj.flatRateCharge = Number(currentLine[9]);
    obj.peakAmount = Number(currentLine[10]);
    obj.peakCharge = Number(currentLine[11]);
    obj.offPeakAmount = Number(currentLine[12]);
    obj.offPeakCharge = Number(currentLine[13]);
    obj.demandBlockAmount = Number(currentLine[14]);
    obj.demandBlockCharge = Number(currentLine[15]);
    obj.generationTransmissionCharge = Number(currentLine[16]);
    obj.deliveryCharge = Number(currentLine[17]);
    obj.transmissionCharge = Number(currentLine[18]);
    obj.powerFactorCharge = Number(currentLine[19]);
    obj.businessCharge = Number(currentLine[20]);
    obj.utilityTax = Number(currentLine[21]);
    obj.latePayment = Number(currentLine[22]);
    obj.otherCharge = Number(currentLine[23]);
    return obj;
  }

  getOtherSourceMeterDataObject(idbMeter: IdbUtilityMeter, currentLine: Array<string>, displayVolumeInput: boolean, displayEnergyUse: boolean): IdbUtilityMeterData {
    let obj: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(idbMeter);
    obj.readDate = new Date(currentLine[1]);
    if (!displayVolumeInput) {
      obj.totalEnergyUse = Number(currentLine[2]);
    } else {
      obj.totalVolume = Number(currentLine[2]);
      if (displayEnergyUse) {
        obj.totalEnergyUse = obj.totalVolume * idbMeter.heatCapacity;
      }
    }
    obj.totalCost = Number(currentLine[3]);
    obj.commodityCharge = Number(currentLine[4]);
    obj.deliveryCharge = Number(currentLine[5]);
    obj.otherCharge = Number(currentLine[6]);
    return obj;
  }

  close() {
    this.emitClose.emit(true);
  }

  setTab(str: string) {
    this.selectedTab = str;
  }
}

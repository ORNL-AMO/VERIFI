import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../../energy-consumption/utility-meter-data/utility-meter-data.service';
import * as _ from 'lodash';
import { ImportMeterDataFile, UploadDataService } from '../upload-data.service';
import { ImportMeterDataService } from '../import-meter-data.service';
@Component({
  selector: 'app-import-meter-data-wizard',
  templateUrl: './import-meter-data-wizard.component.html',
  styleUrls: ['./import-meter-data-wizard.component.css']
})
export class ImportMeterDataWizardComponent implements OnInit {

  //invalid readings with meter number
  invalidReadings: Array<{ meterData: IdbUtilityMeterData, errors: Array<string> }>;
  //valid new readings
  validNewReadings: Array<IdbUtilityMeterData>;
  //valid existing readings (update)
  validExistingReadings: Array<IdbUtilityMeterData>;
  //summaries of valid existing/new
  existingData: Array<{ meterName: string, numberOfEntries: number, startDate: Date, endDate: Date }>;
  newData: Array<{ meterName: string, numberOfEntries: number, startDate: Date, endDate: Date }>;

  //meters existing in facility
  facilityMeters: Array<IdbUtilityMeter>;
  //new valid meters to be imported
  newImportMeters: Array<IdbUtilityMeter>;
  //new invalid meters not being imported
  invalidImportMeters: Array<IdbUtilityMeter>;

  selectedTab: string = 'valid';
  skipExisting: boolean = false;

  //selected meter data file content
  importMeterDataFileWizard: ImportMeterDataFile;
  //meter reading missing meter number
  invalidMissingMeter: Array<IdbUtilityMeterData>;
  //readings with meter number but meter is invalid
  invalidCorrespondingMeter: Array<{ numberOfEntries: number, meterName: string }>;
  totalInvalidCorrespondingMeter: number;

  fileName: string;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private uploadDataService: UploadDataService,
    private importMeterDataService: ImportMeterDataService) { }

  ngOnInit(): void {
    this.initializeArrays();
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    let importMeterFiles = this.uploadDataService.importMeterFiles.getValue();
    this.invalidImportMeters = importMeterFiles.flatMap(dataFile => { return dataFile.importMeterFileSummary.invalidMeters });
    this.newImportMeters = importMeterFiles.flatMap(dataFile => { return dataFile.importMeterFileSummary.newMeters });

    this.importMeterDataFileWizard = this.uploadDataService.importMeterDataFileWizard.getValue();
    this.skipExisting = this.importMeterDataFileWizard.skipExisting;

    this.validNewReadings = JSON.parse(JSON.stringify(this.importMeterDataFileWizard.importMeterDataFileSummary.newMeterData));
    this.validExistingReadings = JSON.parse(JSON.stringify(this.importMeterDataFileWizard.importMeterDataFileSummary.existingMeterData));
    this.setNewData();
    this.setExistingData();
    this.parseInvalidEntries();

    if (this.validNewReadings.length == 0) {
      this.selectedTab = 'existing';
    }

    this.fileName = this.importMeterDataFileWizard.fileName;
    if (this.importMeterDataFileWizard.isTemplateElectricity) {
      this.fileName = this.fileName + ' Electricity';
    } else {
      this.fileName = this.fileName + ' Non-electricity';
    }
  }


  initializeArrays() {
    this.invalidReadings = new Array();
    this.validExistingReadings = new Array();
    this.validNewReadings = new Array();
    this.invalidMissingMeter = new Array();
    this.invalidCorrespondingMeter = new Array();
  }


  parseInvalidEntries() {
    let invalidCorrespondingMeter: Array<{ meterData: IdbUtilityMeterData, meterName: string }> = new Array();
    let invalidData: Array<IdbUtilityMeterData> = JSON.parse(JSON.stringify(this.importMeterDataFileWizard.importMeterDataFileSummary.invalidMeterData));
    invalidData.forEach(entry => {
      if (!entry.meterId && !entry.meterNumber) {
        this.invalidMissingMeter.push(entry);
      } else if (!entry.meterId && entry.meterNumber) {
        let correspondingMeter: IdbUtilityMeter = this.getCorrespondingMeter(entry);
        if (correspondingMeter) {
          invalidCorrespondingMeter.push({ meterName: correspondingMeter.name, meterData: entry });
        } else {
          this.invalidMissingMeter.push(entry);
        }
      } else {
        //use form to get invalid details
        this.addInvalidReading(entry);
      }
    });
    let counts = _.countBy(invalidCorrespondingMeter, 'meterName');
    Object.keys(counts).forEach((key, index) => {
      this.invalidCorrespondingMeter.push({
        numberOfEntries: counts[key],
        meterName: key
      })
    });
    this.totalInvalidCorrespondingMeter = _.sumBy(this.invalidCorrespondingMeter, 'numberOfEntries');
  }


  getCorrespondingMeter(meterData: IdbUtilityMeterData): IdbUtilityMeter {
    let correspondingMeter: IdbUtilityMeter;
    if (meterData.meterId) {
      correspondingMeter = this.facilityMeters.find(meter => { return meter.id == meterData.meterId });
    }
    if (!correspondingMeter) {
      correspondingMeter = this.invalidImportMeters.find(meter => { return meter.meterNumber == meterData.meterNumber || meter.name == meterData.meterNumber });
    }
    if (!correspondingMeter) {
      correspondingMeter = this.facilityMeters.find(meter => { return meter.name == meterData.meterNumber || meter.meterNumber == meterData.meterNumber });
    }
    return correspondingMeter;
  }

  addInvalidReading(meterData: IdbUtilityMeterData) {
    let correspondingMeter: IdbUtilityMeter = this.getCorrespondingMeter(meterData);
    let form: FormGroup;
    if (correspondingMeter.source == 'Electricity') {
      form = this.utilityMeterDataService.getElectricityMeterDataForm(meterData);
    } else {
      let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(correspondingMeter.startingUnit) == false);
      let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(correspondingMeter.source);
      form = this.utilityMeterDataService.getGeneralMeterDataForm(meterData, displayVolumeInput, displayEnergyUse);
    }
    this.invalidReadings.push({
      meterData: meterData,
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

  close() {
    this.uploadDataService.importMeterDataFileWizard.next(undefined);
  }

  setTab(str: string) {
    this.selectedTab = str;
  }

  setExistingData() {
    this.existingData = new Array();
    let existingReadingsExistingMeters: Array<IdbUtilityMeterData> = new Array();
    let existingReadingsNewMeter: Array<IdbUtilityMeterData> = new Array();
    this.validExistingReadings.forEach(reading => {
      if (reading.meterId) {
        existingReadingsExistingMeters.push(reading);
      } else {
        existingReadingsNewMeter.push(reading);
      }
    });

    let counts = _.countBy(existingReadingsExistingMeters, 'meterId');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == Number(key) })
      let meterData: Array<IdbUtilityMeterData> = existingReadingsExistingMeters.filter(reading => { return reading.meterId == meter.id });
      let startDate: IdbUtilityMeterData = _.minBy(meterData, 'readDate');
      let endDate: IdbUtilityMeterData = _.maxBy(meterData, 'readDate');
      this.existingData.push({
        meterName: meter.name,
        numberOfEntries: counts[key],
        startDate: new Date(startDate.readDate),
        endDate: new Date(endDate.readDate)
      });
    });
    counts = _.countBy(existingReadingsNewMeter, 'meterNumber');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.newImportMeters.find(meter => { return meter.name == key || meter.meterNumber == key })
      if (!meter) {
        meter = this.facilityMeters.find(meter => { return meter.name == key || meter.meterNumber == key });
      }
      let meterData: Array<IdbUtilityMeterData> = this.validNewReadings.filter(reading => { return reading.meterNumber == meter.name || reading.meterNumber == meter.meterNumber });
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
    let newReadingsExistingMeters: Array<IdbUtilityMeterData> = new Array();
    let newReadingsNewMeter: Array<IdbUtilityMeterData> = new Array();
    this.validNewReadings.forEach(reading => {
      if (reading.meterId) {
        newReadingsExistingMeters.push(reading);
      } else {
        newReadingsNewMeter.push(reading);
      }
    })

    let counts = _.countBy(newReadingsExistingMeters, 'meterId');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == Number(key) })
      let meterData: Array<IdbUtilityMeterData> = newReadingsExistingMeters.filter(reading => { return reading.meterId == meter.id });
      let startDate: IdbUtilityMeterData = _.minBy(meterData, 'readDate');
      let endDate: IdbUtilityMeterData = _.maxBy(meterData, 'readDate');
      this.newData.push({
        meterName: meter.name,
        numberOfEntries: counts[key],
        startDate: new Date(startDate.readDate),
        endDate: new Date(endDate.readDate)
      });
    });
    counts = _.countBy(newReadingsNewMeter, 'meterNumber');
    Object.keys(counts).forEach((key, index) => {
      let meter: IdbUtilityMeter = this.newImportMeters.find(meter => { return meter.name == key || meter.meterNumber == key });
      if (!meter) {
        meter = this.facilityMeters.find(meter => { return meter.name == key || meter.meterNumber == key });
      }
      let meterData: Array<IdbUtilityMeterData> = this.validNewReadings.filter(reading => { return reading.meterNumber == meter.name || reading.meterNumber == meter.meterNumber });
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

  updateMissingMeterNumberData() {
    let indexesToRemove: Array<number> = new Array();
    this.invalidMissingMeter.forEach((meterData, index) => {
      if (meterData.meterNumber) {
        let meterStatus: { meterData: IdbUtilityMeterData, status: "existing" | "new" | "invalid" } = this.importMeterDataService.getImportMeterDataStatus(meterData, this.facilityMeters, this.newImportMeters);
        if (meterStatus.status == 'existing') {
          indexesToRemove.push(index);
          this.validExistingReadings.push(meterStatus.meterData);
        } else if (meterStatus.status == 'new') {
          indexesToRemove.push(index);
          this.validNewReadings.push(meterStatus.meterData);
        } else if (meterStatus.status == 'invalid') {
          this.addInvalidReading(meterStatus.meterData);
          indexesToRemove.push(index);
        }
      }
    });

    _.remove(this.invalidMissingMeter, (meter, index) => {
      return indexesToRemove.includes(index);
    });
    this.setNewData();
    this.setExistingData();
    if (this.validNewReadings.length != 0) {
      this.setTab('valid');
    } else {
      this.setTab('existing');
    }
  }


  submit() {
    this.importMeterDataFileWizard.importMeterDataFileSummary.existingMeterData = this.validExistingReadings;
    this.importMeterDataFileWizard.importMeterDataFileSummary.newMeterData = this.validNewReadings;
    this.importMeterDataFileWizard.importMeterDataFileSummary.invalidMeterData = new Array();
    this.invalidMissingMeter.forEach(data => {
      this.importMeterDataFileWizard.importMeterDataFileSummary.invalidMeterData.push(data);
    });
    this.invalidReadings.forEach(reading => {
      this.importMeterDataFileWizard.importMeterDataFileSummary.invalidMeterData.push(reading.meterData);
    });
    this.importMeterDataFileWizard.skipExisting = this.skipExisting;
    let importMeterDataFiles: Array<ImportMeterDataFile> = this.uploadDataService.importMeterDataFiles.getValue();
    let wizardFileIndex: number = importMeterDataFiles.findIndex(file => { return file.id == this.importMeterDataFileWizard.id });
    importMeterDataFiles[wizardFileIndex] = this.importMeterDataFileWizard;
    this.uploadDataService.importMeterDataFiles.next(importMeterDataFiles);
    this.close();
  }
}

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { CsvImportData, CsvToJsonService } from 'src/app/shared/helper-services/csv-to-json.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ImportMeterService, ImportMeterFileSummary } from './import-meter.service';
import * as XLSX from 'xlsx';
import { ImportMeterDataFile, UploadDataService } from './upload-data.service';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { FormGroup } from '@angular/forms';
import { ImportMeterDataFileSummary } from './import-meter-data.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  @ViewChild("importFile")
  importFile: ElementRef;

  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary };
  importMeterFileWizardSub: Subscription;
  importMeterDataFileWizard: { fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, id: string, isTemplateElectricity: boolean };
  importMeterDataFileWizardSub: Subscription;

  fileReferences: Array<any>;
  filesUploaded: boolean = false;
  constructor(private csvToJsonService: CsvToJsonService, private loadingService: LoadingService,
    private importMeterService: ImportMeterService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, private uploadDataService: UploadDataService,
    private utilityMeterGroupdbService: UtilityMeterGroupdbService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private utilityMeterdbService: UtilityMeterdbService, private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.initArrays();

    this.importMeterFileWizardSub = this.uploadDataService.importMeterFileWizard.subscribe(val => {
      this.importMeterFileWizard = val;
    });

    this.importMeterDataFileWizardSub = this.uploadDataService.importMeterDataFileWizard.subscribe(val => {
      this.importMeterDataFileWizard = val;
    });
  }

  ngOnDestroy() {
    this.importMeterFileWizardSub.unsubscribe();
    this.importMeterDataFileWizardSub.unsubscribe();
    this.resetData();
  }

  initArrays() {
    this.fileReferences = new Array();
  }

  resetData() {
    this.uploadDataService.resetData();
    this.initArrays();
    this.filesUploaded = false;
    this.importFile.nativeElement.value = ""
  }

  setImportFile(files: FileList) {
    this.initArrays();
    if (files) {
      if (files.length !== 0) {
        let regex = /.csv$/;
        let regex2 = /.CSV$/;
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex.test(files[index].name) || regex2.test(files[index].name) || regex3.test(files[index].name)) {
            this.fileReferences.push(files[index]);
          }
        }
        if (this.fileReferences.length != 0) {
          this.importFiles();
        }
      }
    }
  }

  importFiles() {
    this.fileReferences.forEach(fileReference => {
      let excelTest = /.xlsx$/;
      if (excelTest.test(fileReference.name)) {
        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
          /* read workbook */
          const bstr: string = e.target.result;
          let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
          let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
          if (isTemplate) {
            this.uploadDataService.addTemplateWorkBook(workBook, fileReference.name);
          } else {
            this.uploadDataService.addExcelFile(fileReference);
          }
        };
        reader.readAsBinaryString(fileReference);
      }

      // } else {
      //   let fr: FileReader = new FileReader();
      //   fr.readAsText(fileReference);
      //   fr.onloadend = (e) => {
      //     let importData: any = JSON.parse(JSON.stringify(fr.result));
      //     let fileHeaders: Array<string> = this.csvToJsonService.parseCsvHeaders(importData);
      //     this.addFile(importData, fileHeaders, fileReference.name);
      //   };

      // }
    });
    this.filesUploaded = true;
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Meters-Utilities" && sheetNames[1] == "Electricity" && sheetNames[2] == "Non-electricity" && sheetNames[3] == "HIDE") {
      return true;
    } else {
      return false;
    }
  }


  // addFile(data: any, fileHeaders: Array<string>, fileName: string) {
  //   if (JSON.stringify(fileHeaders) === JSON.stringify(MeterHeaders)) {
  //     this.addMeterFile(data, fileName);
  //   } else if (JSON.stringify(fileHeaders) === JSON.stringify(ElectricityMeterDataHeaders)) {
  //     //electricity meter data template 
  //     // this.filesSummary.push({
  //     //   fileType: 'Meter Data',
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //     this.uploadDataService.addMeterDataFile(fileName, 'Electricity');
  //   } else if (JSON.stringify(fileHeaders) === JSON.stringify(NonElectricityMeterDataHeaders)) {
  //     //non electricity meter data template
  //     // this.filesSummary.push({
  //     //   fileType: 'Meter Data',
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //     this.uploadDataService.addMeterDataFile(fileName, 'Non-Electricity');
  //   } else {
  //     //other .csv file
  //     // this.nonTemplateFiles.push({
  //     //   fileType: undefined,
  //     //   fileData: this.csvToJsonService.parseCsvWithHeaders(data, 0),
  //     //   fileName: fileName
  //     // });
  //   }

  // }

  addMeterFile(data: any, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let fileData: CsvImportData = this.csvToJsonService.parseCsvWithHeaders(data, 0);
    let summary: ImportMeterFileSummary = this.importMeterService.importMetersFromDataFile(fileData, selectedFacility, facilityMeters)
    this.uploadDataService.addMeterFile(fileName, summary);
  }


  /*LOGIC FOR IMPORTING VALID METER AND DATA*/ 
  async importData() {
    this.loadingService.setLoadingMessage("Importing Meters..");
    this.loadingService.setLoadingStatus(true);
    //import valid new and existing meters
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let newMeters: Array<IdbUtilityMeter> = new Array();
    let existingMeters: Array<IdbUtilityMeter> = new Array();
    let importMetersFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }> = this.uploadDataService.importMeterFiles.getValue();
    importMetersFiles.forEach(meterFile => {
      newMeters = newMeters.concat(meterFile.importMeterFileSummary.newMeters);
      existingMeters = existingMeters.concat(meterFile.importMeterFileSummary.existingMeters);
    });

    // add meter groups
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
    let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();
    newMeters.forEach(meter => {
      if (meter.group) {
        let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
        let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
        if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
          let groupType: string = "Energy";
          if (meter.source == 'Water' || meter.source == 'Waste Water') {
            groupType = "Water"
          } else if (meter.source == 'Other Utility') {
            groupType = "Other"
          }
          let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup(groupType, meter.group, meter.facilityId, meter.accountId);
          uniqNeededGroups.push(utilityMeterGroup);
        }
      }
    });
    this.loadingService.setLoadingMessage('Adding meter groups...');
    await uniqNeededGroups.forEach(neededGroup => {
      this.utilityMeterGroupdbService.addFromImport(neededGroup);
    });

    //update groups behavior subject, set groupId's for meters
    this.utilityMeterGroupdbService.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(meterGroups => {
      this.utilityMeterGroupdbService.facilityMeterGroups.next(meterGroups);
      newMeters = this.setGroupIds(newMeters);
      existingMeters = this.setGroupIds(existingMeters);
      //add meters
      this.addMeters(newMeters, existingMeters);

      //update meter behavior subjects
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.utilityMeterdbService.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityMeters => {
        this.utilityMeterdbService.facilityMeters.next(facilityMeters);
        this.utilityMeterdbService.getAllByIndexRange('accountId', selectedFacility.accountId).subscribe(facilityMeters => {
          this.utilityMeterdbService.accountMeters.next(facilityMeters);
          //add meter data
          this.addMeterData(facilityMeters, selectedFacility);
        });
      });

    });
  }


  async addMeters(newMeters: Array<IdbUtilityMeter>, existingMeters: Array<IdbUtilityMeter>) {
    this.loadingService.setLoadingMessage('Addings meters...')
    await newMeters.forEach((importMeter: IdbUtilityMeter, index: number) => {
      importMeter.energyUnit = this.getMeterEnergyUnit(importMeter);
      this.utilityMeterdbService.addWithObservable(importMeter);
    });
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterdbService.facilityMeters.getValue();
    await existingMeters.forEach((importMeter: IdbUtilityMeter, index: number) => {
      //check if meter already exists (same name)
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
      if (facilityMeter) {
        //update existing meter with form from import meter
        let form: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
        facilityMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, form);
        facilityMeter.energyUnit = this.getMeterEnergyUnit(facilityMeter);
        //update
        this.utilityMeterdbService.updateWithObservable(facilityMeter);
      }
    });
  }

  async addMeterData(facilityMeters: Array<IdbUtilityMeter>, selectedFacility: IdbFacility) {
    this.loadingService.setLoadingMessage('Adding meter readings..');
    //import valid meter readings
    let importMeterDataFiles: Array<ImportMeterDataFile> = this.uploadDataService.importMeterDataFiles.getValue();
    //fill out new/existing arrays from files
    let newReadings: Array<IdbUtilityMeterData> = new Array();
    let existingReadings: Array<IdbUtilityMeterData> = new Array();
    importMeterDataFiles.forEach(dataFile => {
      newReadings = newReadings.concat(dataFile.importMeterDataFileSummary.newMeterData);
      //check we aren't skiping the existing readings for that file
      if (!dataFile.skipExisting) {
        existingReadings = existingReadings.concat(dataFile.importMeterDataFileSummary.existingMeterData);
      }
    });
    //set meterId's
    newReadings = newReadings.map(reading => { return this.setMeterId(reading, facilityMeters) });
    existingReadings = existingReadings.map(reading => { return this.setMeterId(reading, facilityMeters) });
    //add new readings
    await newReadings.forEach(reading => {
      this.utilityMeterDataDbService.addWithObservable(reading);
    });
    //add existing readings
    await existingReadings.forEach(reading => {
      this.utilityMeterDataDbService.updateWithObservable(reading);
    });
    //update behavior subjects and reset import
    this.utilityMeterDataDbService.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(meterData => {
      this.utilityMeterDataDbService.facilityMeterData.next(meterData);
      this.utilityMeterDataDbService.getAllByIndexRange('accountId', selectedFacility.accountId).subscribe(meterData => {
        this.utilityMeterDataDbService.accountMeterData.next(meterData);
        this.loadingService.setLoadingStatus(false);
        this.resetData();
      });
    });
  }

  setGroupIds(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue()
    meters.forEach(meter => {
      let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
      if (existingGroup) {
        meter.groupId = existingGroup.id;
      }
    });
    return meters;
  }

  getMeterEnergyUnit(meter: IdbUtilityMeter): string {
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
    if (isEnergyUnit) {
      return meter.startingUnit;
    } else {
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      if (isEnergyMeter) {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        return selectedFacility.energyUnit;
      } else {
        return undefined;
      }
    }
  }

  setMeterId(meterData: IdbUtilityMeterData, facilityMeters: Array<IdbUtilityMeter>): IdbUtilityMeterData {
    if (meterData.meterId) {
      return meterData;
    } else {
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.meterNumber == meterData.meterNumber || meter.name == meterData.meterNumber });
      if (facilityMeter) {
        meterData.meterId = facilityMeter.id;
        return meterData;
      } else {
        return meterData;
      }
    }
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import * as XLSX from 'xlsx';
import { ImportMeterDataFileSummary, ImportMeterDataService } from './import-meter-data.service';
import { ImportMeterFileSummary, ImportMeterService } from './import-meter.service';
import { ImportPredictorFileSummary, ImportPredictorsService } from './import-predictors.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  importMeterFiles: BehaviorSubject<Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>>;
  importMeterDataFiles: BehaviorSubject<Array<ImportMeterDataFile>>;
  importPredictorsFiles: BehaviorSubject<Array<ImportPredictorFile>>;
  excelFiles: BehaviorSubject<Array<File>>;
  templateWorkBooks: BehaviorSubject<Array<{ workBook: XLSX.WorkBook, fileName: string }>>;

  importMeterFileWizard: BehaviorSubject<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>;
  importMeterDataFileWizard: BehaviorSubject<ImportMeterDataFile>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private importMeterService: ImportMeterService,
    private importMeterDataService: ImportMeterDataService, private importPredictorsService: ImportPredictorsService,
    private predictorsDbService: PredictordbService) {
    this.importMeterFiles = new BehaviorSubject([]);
    this.excelFiles = new BehaviorSubject<Array<File>>([]);
    this.importMeterDataFiles = new BehaviorSubject([]);
    this.templateWorkBooks = new BehaviorSubject([]);
    this.importPredictorsFiles = new BehaviorSubject([]);
    this.importMeterFileWizard = new BehaviorSubject(undefined);
    this.importMeterDataFileWizard = new BehaviorSubject(undefined);

    this.templateWorkBooks.subscribe(workBookData => {
      this.parseWorkBooks(workBookData);
    });
  }

  resetData() {
    this.importMeterFiles.next([]);
    this.excelFiles.next([]);
    this.importMeterDataFiles.next([]);
    this.templateWorkBooks.next([]);
    this.importPredictorsFiles.next([]);
    this.importMeterFileWizard.next(undefined);
    this.importMeterDataFileWizard.next(undefined);
  }


  addMeterFile(fileName: string, summary: ImportMeterFileSummary) {
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }> = this.importMeterFiles.getValue();
    importMeterFiles.push({
      fileName: fileName,
      importMeterFileSummary: summary,
      id: Math.random().toString(36).substr(2, 9),
    });
    this.importMeterFiles.next(importMeterFiles);
  }

  addExcelFile(fileReference: any) {
    let excelFiles: Array<File> = this.excelFiles.getValue();
    excelFiles.push(fileReference);
    this.excelFiles.next(excelFiles);
  }


  addTemplateWorkBook(workBook: XLSX.WorkBook, fileName: string) {
    let templateWorkBooks: Array<{ workBook: XLSX.WorkBook, fileName: string }> = this.templateWorkBooks.getValue();
    templateWorkBooks.push({ workBook: workBook, fileName: fileName });
    this.templateWorkBooks.next(templateWorkBooks);
  }

  addMeterDataFile(fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, isTemplateElectricity: boolean) {
    let importMeterDataFiles: Array<ImportMeterDataFile> = this.importMeterDataFiles.getValue();
    importMeterDataFiles.push({
      fileName: fileName,
      importMeterDataFileSummary: importMeterDataFileSummary,
      id: Math.random().toString(36).substr(2, 9),
      isTemplateElectricity: isTemplateElectricity,
      skipExisting: false
    });
    this.importMeterDataFiles.next(importMeterDataFiles);
  }

  parseWorkBooks(workBooksData: Array<{ workBook: XLSX.WorkBook, fileName: string }>, skipMeters?: boolean) {
    workBooksData.forEach(data => {
      if (!skipMeters) {
        //meters
        let meterData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Meters-Utilities"]);
        this.addMetersFromTemplate(meterData, data.fileName)
      }
      //electricity readings
      let electricityMeterReadingData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Electricity"]);
      this.addMeterDataFromTemplate(electricityMeterReadingData, data.fileName, true);
      //non electricity readings
      let nonElectricityMeterData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Non-electricity"]);
      this.addMeterDataFromTemplate(nonElectricityMeterData, data.fileName, false);
      //predictors
      let predictorsData: Array<any> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Predictors"]);
      //headers used for predictors, parse data with headers. First element in array will be headers
      let predictorDataWithHeaders: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Predictors"], { header: 1 });
      this.addPredictorDataFromTemplate(predictorsData, predictorDataWithHeaders[0], data.fileName);
    });
  }

  addMetersFromTemplate(fileData: any, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let summary: ImportMeterFileSummary = this.importMeterService.getMetersSummaryFromTemplateFile(fileData, selectedFacility, facilityMeters)
    this.addMeterFile(fileName, summary);
  }

  addMeterDataFromTemplate(fileData: any, fileName: string, isTemplateElectricity: boolean) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }> = this.importMeterFiles.getValue();
    let metersToImport: Array<IdbUtilityMeter> = importMeterFiles.flatMap(importMeterFile => { return importMeterFile.importMeterFileSummary.newMeters });
    let summary: ImportMeterDataFileSummary = this.importMeterDataService.getMeterDataSummaryFromTemplateFile(fileData, selectedFacility, facilityMeters, isTemplateElectricity, metersToImport);
    this.addMeterDataFile(fileName, summary, isTemplateElectricity);
  }

  updateMeterDataFromTemplates() {
    let importMeterDataFiles: Array<ImportMeterDataFile> = this.importMeterDataFiles.getValue();
    //hold on to non template files
    let nonTemplateFiles: Array<ImportMeterDataFile> = importMeterDataFiles.filter(file => { return file.isTemplateElectricity == undefined });
    //reset array
    this.importMeterDataFiles.next([]);
    //re parse workbooks
    let templateWorkBooks: Array<{ workBook: XLSX.WorkBook, fileName: string }> = this.templateWorkBooks.getValue();
    this.parseWorkBooks(templateWorkBooks, true);
    //add excel files back in
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }> = this.importMeterFiles.getValue();
    let metersToImport: Array<IdbUtilityMeter> = importMeterFiles.flatMap(importMeterFile => { return importMeterFile.importMeterFileSummary.newMeters });

    nonTemplateFiles.forEach(file => {
      let meterDataArr: Array<IdbUtilityMeterData> = new Array();
      file.importMeterDataFileSummary.existingMeterData.forEach(meterData => {
        meterDataArr.push(meterData);
      });
      file.importMeterDataFileSummary.invalidMeterData.forEach(meterData => {
        meterDataArr.push(meterData);
      });
      file.importMeterDataFileSummary.newMeterData.forEach(meterData => {
        meterDataArr.push(meterData);
      });
      file.importMeterDataFileSummary = this.importMeterDataService.getMeterDataSummaryFromExcelFile(meterDataArr, facilityMeters, metersToImport);
      this.addMeterDataFile(file.fileName, file.importMeterDataFileSummary, undefined);
    })

  }

  removeExcelFile(fileName: string) {
    let excelFiles: Array<File> = this.excelFiles.getValue();
    let fileIndex: number = excelFiles.findIndex(file => { return file.name == fileName });
    excelFiles.splice(fileIndex, 1);
    this.excelFiles.next(excelFiles);
  }


  addPredictorDataFromTemplate(predictorsData: Array<any>, predictorHeaders: Array<string>, fileName: string) {
    // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityPredictors: Array<PredictorData> = this.predictorsDbService.facilityPredictors.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.facilityPredictorEntries.getValue();
    let summary: ImportPredictorFileSummary = this.importPredictorsService.getSummaryFromTemplatesFile(predictorsData, predictorHeaders, facilityPredictors, facilityPredictorEntries);
    this.addPredictorFile(fileName, summary);
  }


  addPredictorFile(fileName: string, summary: ImportPredictorFileSummary) {
    let importPredictorFiles: Array<ImportPredictorFile> = this.importPredictorsFiles.getValue();
    importPredictorFiles.push({
      fileName: fileName,
      importPredictorFileSummary: summary,
      id: Math.random().toString(36).substr(2, 9),
      skipExisting: false
    });
    this.importPredictorsFiles.next(importPredictorFiles);
  }
}


export interface ImportMeterDataFile {
  fileName: string,
  importMeterDataFileSummary: ImportMeterDataFileSummary,
  id: string,
  isTemplateElectricity: boolean,
  skipExisting: boolean
}


export interface ImportPredictorFile {
  fileName: string,
  id: string,
  skipExisting: boolean,
  importPredictorFileSummary: ImportPredictorFileSummary
}
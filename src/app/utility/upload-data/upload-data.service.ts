import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as XLSX from 'xlsx';
import { ImportMeterDataFileSummary, ImportMeterDataService } from './import-meter-data.service';
import { ImportMeterFileSummary, ImportMeterService } from './import-meter.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  importMeterFiles: BehaviorSubject<Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>>;
  importMeterDataFiles: BehaviorSubject<Array<{ fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, id: string, isTemplateElectricity: boolean }>>;
  excelFiles: BehaviorSubject<Array<File>>;
  excelImportMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
  excelImportMeterDates: BehaviorSubject<Array<Date>>;
  excelImportMeterConsumption: BehaviorSubject<Array<Array<number>>>;
  templateWorkBooks: BehaviorSubject<Array<{ workBook: XLSX.WorkBook, fileName: string }>>;

  importMeterFileWizard: BehaviorSubject<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }>;

  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private importMeterService: ImportMeterService,
    private ImportMeterDataService: ImportMeterDataService, private utilityMeterDataDbService: UtilityMeterDatadbService) {
    this.importMeterFiles = new BehaviorSubject([]);
    this.excelFiles = new BehaviorSubject<Array<File>>([]);
    this.excelImportMeters = new BehaviorSubject<Array<IdbUtilityMeter>>([]);
    this.excelImportMeterDates = new BehaviorSubject<Array<Date>>([]);
    this.excelImportMeterConsumption = new BehaviorSubject<Array<Array<number>>>([]);
    this.importMeterDataFiles = new BehaviorSubject([]);
    this.templateWorkBooks = new BehaviorSubject([]);
    this.importMeterFileWizard = new BehaviorSubject(undefined);


    this.templateWorkBooks.subscribe(workBookData => {
      this.parseWorkBooks(workBookData);
    });
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
    let importMeterDataFiles: Array<{ fileName: string, importMeterDataFileSummary: ImportMeterDataFileSummary, id: string, isTemplateElectricity: boolean }> = this.importMeterDataFiles.getValue();
    importMeterDataFiles.push({
      fileName: fileName,
      importMeterDataFileSummary: importMeterDataFileSummary,
      id: Math.random().toString(36).substr(2, 9),
      isTemplateElectricity: isTemplateElectricity
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
    });
  }

  addMetersFromTemplate(fileData: any, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    // let fileData: CsvImportData = this.csvToJsonService.parseCsvWithHeaders(data, 0);
    let summary: ImportMeterFileSummary = this.importMeterService.importMetersFromTemplateFile(fileData, selectedFacility, facilityMeters)
    this.addMeterFile(fileName, summary);
  }

  addMeterDataFromTemplate(fileData: any, fileName: string, isTemplateElectricity: boolean) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    // let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }> = this.importMeterFiles.getValue();
    let metersToImport: Array<IdbUtilityMeter> = importMeterFiles.flatMap(importMeterFile => { return importMeterFile.importMeterFileSummary.newMeters });
    let summary: ImportMeterDataFileSummary = this.ImportMeterDataService.importMeterDataFromTemplateFile(fileData, selectedFacility, facilityMeters, isTemplateElectricity, metersToImport);
    this.addMeterDataFile(fileName, summary, isTemplateElectricity);
  }

  updateMeterDataFromTemplates() {
    this.importMeterDataFiles.next([]);
    let templateWorkBooks: Array<{ workBook: XLSX.WorkBook, fileName: string }> = this.templateWorkBooks.getValue();
    this.parseWorkBooks(templateWorkBooks, true);
  }


  importData(){
    
  }
}

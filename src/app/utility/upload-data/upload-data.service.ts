import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import * as XLSX from 'xlsx';
import { ImportMeterFileSummary, ImportMeterService } from './import-meter.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  importMeterFiles: BehaviorSubject<Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }>>;
  importMeterDataFiles: BehaviorSubject<Array<{ fileName: string, fileType: string }>>;
  excelFiles: BehaviorSubject<Array<File>>;
  excelImportMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
  excelImportMeterDates: BehaviorSubject<Array<Date>>;
  excelImportMeterConsumption: BehaviorSubject<Array<Array<number>>>;
  templateWorkBooks: BehaviorSubject<Array<{workBook: XLSX.WorkBook, fileName: string}>>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private importMeterService: ImportMeterService) {
    this.importMeterFiles = new BehaviorSubject([]);
    this.excelFiles = new BehaviorSubject<Array<File>>([]);
    this.excelImportMeters = new BehaviorSubject<Array<IdbUtilityMeter>>([]);
    this.excelImportMeterDates = new BehaviorSubject<Array<Date>>([]);
    this.excelImportMeterConsumption = new BehaviorSubject<Array<Array<number>>>([]);
    this.importMeterDataFiles = new BehaviorSubject([]);
    this.templateWorkBooks = new BehaviorSubject([]);


    this.templateWorkBooks.subscribe(workBookData => {
      this.parseWorkBooks(workBookData);
    })

  }

  addMeterFile(fileName: string, summary: ImportMeterFileSummary) {
    let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }> = this.importMeterFiles.getValue();
    importMeterFiles.push({
      fileName: fileName,
      importMeterFileSummary: summary
    });
    this.importMeterFiles.next(importMeterFiles);
  }

  addExcelFile(fileReference: any) {
    let excelFiles: Array<File> = this.excelFiles.getValue();
    excelFiles.push(fileReference);
    this.excelFiles.next(excelFiles);
  }


  addTemplateWorkBook(workBook: XLSX.WorkBook, fileName: string) {
    let templateWorkBooks: Array<{workBook: XLSX.WorkBook, fileName: string}> = this.templateWorkBooks.getValue();
    templateWorkBooks.push({workBook: workBook, fileName: fileName});
    this.templateWorkBooks.next(templateWorkBooks);
  }

  addMeterDataFile(fileName: string, fileType: string) {
    let importMeterDataFiles: Array<{ fileName: string, fileType: string }> = this.importMeterDataFiles.getValue();
    importMeterDataFiles.push({
      fileName: fileName,
      fileType: fileType
    });
  }

  parseWorkBooks(workBooksData: Array<{workBook: XLSX.WorkBook, fileName: string}>) {
    workBooksData.forEach(data => {
      //meters
      let meterData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Meters-Utilities"]);
      this.addMetersFromTemplate(meterData, data.fileName)
      console.log(meterData);
      //electricity readings
      let electricityMeterReadingData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Electricity"]);
      console.log(electricityMeterReadingData);
      //non electricity readings
      let nonElectricityMeterData: Array<Array<string>> = XLSX.utils.sheet_to_json(data.workBook.Sheets["Non-electricity"]);
      console.log(nonElectricityMeterData);
    });
  }

  addMetersFromTemplate(fileData: any, fileName: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    // let fileData: CsvImportData = this.csvToJsonService.parseCsvWithHeaders(data, 0);
    let summary: ImportMeterFileSummary = this.importMeterService.importMetersFromTemplateFile(fileData, selectedFacility, facilityMeters)
    this.addMeterFile(fileName, summary);
  }
}

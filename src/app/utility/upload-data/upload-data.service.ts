import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { ImportMeterFileSummary } from './import-meter.service';

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

  constructor() {
    this.importMeterFiles = new BehaviorSubject([]);
    this.excelFiles = new BehaviorSubject<Array<File>>([]);
    this.excelImportMeters = new BehaviorSubject<Array<IdbUtilityMeter>>([]);
    this.excelImportMeterDates = new BehaviorSubject<Array<Date>>([]);
    this.excelImportMeterConsumption = new BehaviorSubject<Array<Array<number>>>([]);
    this.importMeterDataFiles = new BehaviorSubject([]);
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

  addMeterDataFile(fileName: string, fileType: string) {
    let importMeterDataFiles: Array<{ fileName: string, fileType: string }> = this.importMeterDataFiles.getValue();
    importMeterDataFiles.push({
      fileName: fileName,
      fileType: fileType
    });
  }
}

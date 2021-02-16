import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ImportMeterFileSummary } from './import-meter.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  importMeterFiles: BehaviorSubject<Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary }>>;
  excelFiles: BehaviorSubject<Array<File>>;
  // selectedExcelFile: BehaviorSubject<File>;
  constructor() {
    this.importMeterFiles = new BehaviorSubject([]);
    this.excelFiles = new BehaviorSubject<Array<File>>([]);
    // this.selectedExcelFile = new BehaviorSubject<File>(undefined);
  }


  initArrays() {
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
}

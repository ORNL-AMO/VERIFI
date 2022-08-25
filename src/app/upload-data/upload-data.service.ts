import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkBook } from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  fileReferences: Array<FileReference>;
  allFilesSet: BehaviorSubject<boolean>;
  constructor() { 
    this.allFilesSet = new BehaviorSubject<boolean>(false);
    this.fileReferences = new Array();
  }
}


export interface FileReference {
  name: string,
  // type: '.csv' | '.xlsx',
  file: File,
  dataSet: boolean,
  id: string,
  workbook: WorkBook,
  isTemplate: boolean
}
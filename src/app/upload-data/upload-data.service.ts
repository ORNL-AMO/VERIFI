import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkBook } from 'xlsx';
import { IdbUtilityMeter } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  fileReferences: Array<FileReference>;
  allFilesSet: BehaviorSubject<boolean>;
  uploadMeters: Array<IdbUtilityMeter>;
  constructor() { 
    this.allFilesSet = new BehaviorSubject<boolean>(false);
    this.fileReferences = new Array();
    this.uploadMeters = new Array();
  }
}


export interface FileReference {
  name: string,
  // type: '.csv' | '.xlsx',
  file: File,
  dataSet: boolean,
  id: string,
  workbook: WorkBook,
  isTemplate: boolean,
  selectedWorksheetName: string,
  selectedWorksheetData: Array<Array<string>>,
  columnGroups: Array<ColumnGroup>,
  headerMap: Array<any>
}

export interface ColumnGroup {
  groupLabel: string,
  groupItems: Array<ColumnItem>,
  id: string
}


export interface ColumnItem {
  index: number,
  value: string,
  id: string,
  facilityId?: string
}
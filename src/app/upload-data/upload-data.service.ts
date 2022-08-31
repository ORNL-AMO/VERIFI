import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkBook } from 'xlsx';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';

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
  meterFacilityGroups: Array<FacilityGroup>,
  predictorFacilityGroups: Array<FacilityGroup>,
  headerMap: Array<any>,
  importFacilities: Array<IdbFacility>,
  meters: Array<IdbUtilityMeter>
}

export interface ColumnGroup {
  groupLabel: string,
  groupItems: Array<ColumnItem>,
  id: string
}

export interface FacilityGroup {
  facilityId: string,
  groupItems: Array<ColumnItem>,
  facilityName: string,
  color: string
}

export interface ColumnItem {
  index: number,
  value: string,
  id: string,
  // fileName?: string
}
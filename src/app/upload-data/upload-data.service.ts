import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  file: any,
  dataSet: boolean,
  id: number
}
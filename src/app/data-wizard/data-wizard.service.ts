import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FileReference } from '../upload-data/upload-data-models';

@Injectable({
  providedIn: 'root'
})
export class DataWizardService {

  fileReferences: BehaviorSubject<Array<FileReference>>;
  sidebarOpen: BehaviorSubject<boolean>;
  helpPanelOpen: BehaviorSubject<boolean>;
  helpWidth: number = 200;
  sidebarWidth: number = 200;
  constructor(  ) {
    this.sidebarOpen = new BehaviorSubject<boolean>(true);
    this.helpPanelOpen = new BehaviorSubject<boolean>(true);
    this.fileReferences = new BehaviorSubject<Array<FileReference>>([]);
  }

  getFileReferenceById(id: string): FileReference {
    return this.fileReferences.getValue().find(ref => { return ref.id == id });
  }
}

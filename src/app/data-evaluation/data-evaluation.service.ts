import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FileReference } from '../data-management/data-management-import/import-services/upload-data-models';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
  providedIn: 'root'
})
export class DataEvaluationService {

  fileReferences: BehaviorSubject<Array<FileReference>>;
  sidebarOpen: BehaviorSubject<boolean>;
  helpPanelOpen: BehaviorSubject<boolean>;
  helpWidth: number = 200;
  sidebarWidth: number = 200;
  helpWidthBs: BehaviorSubject<number>;
  print: BehaviorSubject<boolean>;
  constructor(private localStorageService: LocalStorageService) {
    this.fileReferences = new BehaviorSubject<Array<FileReference>>([]);
    this.print = new BehaviorSubject<boolean>(false);
    this.helpWidth = this.localStorageService.retrieve("dataEvalHelpWidth");
    if (!this.helpWidth) {
      this.helpWidth = 200;
    }
    if (this.helpWidth == 50) {
      this.helpPanelOpen = new BehaviorSubject<boolean>(false);
    } else {
      this.helpPanelOpen = new BehaviorSubject<boolean>(true);
    }

    this.helpWidthBs = new BehaviorSubject<number>(this.helpWidth);

    this.sidebarWidth = this.localStorageService.retrieve("dataEvalSidebarWidth");
    if (!this.sidebarWidth) {
      this.sidebarWidth = 200;
    }
    if (this.sidebarWidth == 50) {
      this.sidebarOpen = new BehaviorSubject<boolean>(false);
    } else {
      this.sidebarOpen = new BehaviorSubject<boolean>(true);
    }
  }

  getFileReferenceById(id: string): FileReference {
    return this.fileReferences.getValue().find(ref => { return ref.id == id });
  }

  setHelpWidth(val: number) {
    this.helpWidth = val;
    this.localStorageService.store("dataEvalHelpWidth", val);
  }

  setSidebarWidth(val: number) {
    this.sidebarWidth = val;
    this.localStorageService.store("dataEvalSidebarWidth", val);
  }
}

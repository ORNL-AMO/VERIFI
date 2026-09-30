import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FileReference } from '@data/import/spreadsheet-import.models';
import { LocalStorageService } from 'ngx-webstorage';

const predictorDraftStorageKey = 'dataManagementPredictorDraftGuids';

@Injectable({
  providedIn: 'root'
})
export class DataManagementService {

  fileReferences: BehaviorSubject<Array<FileReference>>;
  sidebarOpen: BehaviorSubject<boolean>;
  helpPanelOpen: BehaviorSubject<boolean>;
  helpWidth: number = 200;
  sidebarWidth: number = 200;
  draftPredictorGuids: Set<string>;
  
  constructor(private localStorageService: LocalStorageService) {
    this.fileReferences = new BehaviorSubject<Array<FileReference>>([]);
    this.draftPredictorGuids = new Set(this.getStoredPredictorDraftGuids());

    this.helpWidth = this.localStorageService.retrieve("helpWidth");
    if (!this.helpWidth) {
      this.helpWidth = 200;
    }
    if (this.helpWidth == 50) {
      this.helpPanelOpen = new BehaviorSubject<boolean>(false);
    } else {
      this.helpPanelOpen = new BehaviorSubject<boolean>(true);
    }

    this.sidebarWidth = this.localStorageService.retrieve("sidebarWidth");
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

  markPredictorDraft(predictorGuid: string) {
    this.draftPredictorGuids.add(predictorGuid);
    this.persistPredictorDraftGuids();
  }

  isPredictorDraft(predictorGuid: string): boolean {
    return this.draftPredictorGuids.has(predictorGuid);
  }

  completePredictorDraft(predictorGuid: string) {
    if (this.draftPredictorGuids.delete(predictorGuid)) {
      this.persistPredictorDraftGuids();
    }
  }

  private getStoredPredictorDraftGuids(): Array<string> {
    const stored = this.localStorageService.retrieve(predictorDraftStorageKey);
    if (!Array.isArray(stored)) {
      return [];
    }
    return stored.filter((guid): guid is string => typeof guid === 'string' && guid.length > 0);
  }

  private persistPredictorDraftGuids() {
    if (this.draftPredictorGuids.size === 0) {
      this.localStorageService.clear(predictorDraftStorageKey);
      return;
    }
    this.localStorageService.store(predictorDraftStorageKey, [...this.draftPredictorGuids]);
  }

  setHelpWidth(val: number) {
    this.helpWidth = val;
    this.localStorageService.store("helpWidth", val);
  }

  setSidebarWidth(val: number) {
    this.sidebarWidth = val;
    this.localStorageService.store("sidebarWidth", val);
  }
}

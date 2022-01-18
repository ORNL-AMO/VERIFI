import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;
  constructor(private localStorageService: LocalStorageService) {
    let dataDisplay: "graph" | "table" = this.localStorageService.retrieve("analysisDataDisplay");
    if (!dataDisplay) {
      dataDisplay = "table";
    }
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">(dataDisplay);

    this.dataDisplay.subscribe(dataDisplay => {
      if (dataDisplay) {
        this.localStorageService.store('analysisDataDisplay', dataDisplay);
      }
    });
  }
}

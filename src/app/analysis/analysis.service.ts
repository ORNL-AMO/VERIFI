import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;
  constructor() {
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">("graph");
  }
}

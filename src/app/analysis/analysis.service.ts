import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  constructor() { 
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
  }
}

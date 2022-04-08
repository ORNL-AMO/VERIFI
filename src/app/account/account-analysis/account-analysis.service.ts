import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisService {

  selectedFacility: BehaviorSubject<IdbFacility>;
  constructor() { 
    this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
  }
}

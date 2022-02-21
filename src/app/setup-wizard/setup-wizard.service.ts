import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdbAccount, IdbFacility } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class SetupWizardService {

  account: BehaviorSubject<IdbAccount>;
  facilities: Array<IdbFacility>;
  selectedFacility: BehaviorSubject<IdbFacility>;
  submit: BehaviorSubject<boolean>;
  constructor() { 
    this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
    this.account = new BehaviorSubject<IdbAccount>(undefined);
    this.submit = new BehaviorSubject<boolean>(false);
  }
}

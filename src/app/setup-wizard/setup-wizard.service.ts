import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '../models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class SetupWizardService {

  account: BehaviorSubject<IdbAccount>;
  facilities: BehaviorSubject<Array<IdbFacility>>;
  selectedFacility: BehaviorSubject<IdbFacility>;
  submit: BehaviorSubject<boolean>;
  canContinue: BehaviorSubject<boolean>;
  facilityTemplateWorkbook: BehaviorSubject<XLSX.WorkBook>;
  constructor(private router: Router) {
    this.initializeData();
  }

  initializeData() {
    this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
    this.account = new BehaviorSubject<IdbAccount>(undefined);
    this.submit = new BehaviorSubject<boolean>(false);
    this.facilities = new BehaviorSubject<Array<IdbFacility>>([]);
    this.canContinue = new BehaviorSubject<boolean>(true);
    this.facilityTemplateWorkbook = new BehaviorSubject<XLSX.WorkBook>(undefined);
  }

  addFacility(){
    let facilities: Array<IdbFacility> = this.facilities.getValue();
    let account: IdbAccount = this.account.getValue();
    let newFacility: IdbFacility = getNewIdbFacility(JSON.parse(JSON.stringify(account)));
    newFacility.wizardId = Math.random().toString(36).substr(2, 9);
    newFacility.name = 'Facility ' + (facilities.length + 1);
    facilities.push(newFacility);
    this.facilities.next(facilities);
    this.selectedFacility.next(newFacility);
    this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
  }
}

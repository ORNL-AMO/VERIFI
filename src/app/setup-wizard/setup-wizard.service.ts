import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class SetupWizardService {

  account: IdbAccount;
  facilities: Array<IdbFacility>;

  constructor() { }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImportBackupModalService {

  showModal: BehaviorSubject<boolean>;
  inFacility: boolean;
  constructor() { 
    this.showModal = new BehaviorSubject<boolean>(false);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {

  modalOpen: BehaviorSubject<boolean>;
  sidebarOpen: BehaviorSubject<boolean>;
  headerHeight: BehaviorSubject<number>;
  constructor() { 
    this.modalOpen = new BehaviorSubject<boolean>(false);
    this.sidebarOpen = new BehaviorSubject<boolean>(undefined);
    this.headerHeight = new BehaviorSubject<number>(0);
  }
}

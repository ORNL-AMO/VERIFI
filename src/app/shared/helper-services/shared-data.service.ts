import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {

  modalOpen: BehaviorSubject<boolean>;
  constructor() { 
    this.modalOpen = new BehaviorSubject<boolean>(false);
  }
}

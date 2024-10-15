import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportsService {

  print: BehaviorSubject<boolean>;
  constructor() {
    this.print = new BehaviorSubject<boolean>(false);
  }
}

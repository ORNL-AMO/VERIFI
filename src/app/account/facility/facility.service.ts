import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
  providedIn: 'root'
})
export class FacilityService {
  public facilityId: BehaviorSubject<number> = new BehaviorSubject<number>(1);

  constructor(
    private localStorage: LocalStorageService) { }

  // getValue(): Observable<number> {
  //   // Keep users state
  //   if (this.localStorage.retrieve('facilityid')) {
  //     this.facilityId.next(this.localStorage.retrieve('facilityid'));
  //   }
  //   return this.facilityId.asObservable();
  // }
  // setValue(newValue: number): void {
  //   this.localStorage.store('facilityid', newValue);
  //   this.facilityId.next(newValue);
  // }
}
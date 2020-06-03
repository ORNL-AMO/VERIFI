import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FacilityService {
  public facilityId = new BehaviorSubject(2);

  getValue(): Observable<number> {
    return this.facilityId.asObservable();
  }
  setValue(newValue): void {
    this.facilityId.next(newValue);
  }
}
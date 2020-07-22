import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from "../../indexedDB/facility-db-service";
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root'
})
export class FacilityService {
  public facilityId = new BehaviorSubject(1);
  public facilityObject: any;

  constructor(
    private localStorage:LocalStorageService,
    public facilitydbService: FacilitydbService) { }

  getValue(): Observable<number> {
    // Keep users state
    if(this.localStorage.retrieve('facilityid')) {
        this.facilityId.next(this.localStorage.retrieve('facilityid'));
    }
    return this.facilityId.asObservable();
  }
  setValue(newValue): void {
    this.localStorage.store('facilityid', newValue);
    this.facilityId.next(newValue);
  }

/*
  getActiveFacility() {
    // Keep users state
    if(this.localStorage.retrieve('facilityObject')) {
      this.facilityObject = this.localStorage.retrieve('facilityObject');
    }
    console.log("this.facilityObject");
    console.log(this.facilityObject);
    return this.facilityObject;
  }
  setActiveFacility() {
    this.facilitydbService.getById(this.facilityId.value).then(
      data => {
        console.log("data");
        this.localStorage.store('facilityObject', data);
      },
      error => {
          console.log(error);
      }
    );
  }*/
}
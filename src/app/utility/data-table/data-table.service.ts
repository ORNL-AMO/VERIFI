import { ElementRef, QueryList, ViewChildren, Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable, BehaviorSubject } from 'rxjs';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../utility/utility.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { LoadingService } from "../../shared/loading/loading.service";

@Injectable({
  providedIn: 'root'
})
export class EnergyConsumptionService {
    accountid: number;
    facilityid: number;
    meterList: any = [];

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private utilityService: UtilityService,
    private loadingService: LoadingService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService
  ) { 
     // Observe the accountid var
     this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
    });   
  
    // Observe the meter list
    this.utilityService.getDisplayObj().subscribe((value) => {
      this.meterList = value;
    });

    // Observe the meter list
    this.utilityService.getMeterData();
  }
/*
  getValue(): Observable<number> {
    // Keep users state
    //return this.energySource.asObservable();
  }

  setValue(newValue): void {
    //this.energySource.next(newValue);
  }*/

}
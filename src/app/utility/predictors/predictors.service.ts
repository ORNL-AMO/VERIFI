import { ElementRef, QueryList, ViewChildren, Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable, BehaviorSubject } from 'rxjs';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { LoadingService } from "../../shared/loading/loading.service";


@Injectable({
  providedIn: 'root'
})
export class PredictorsService {
    accountid: number;
    facilityid: number;

    public predictors = new BehaviorSubject([]);

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private loadingService: LoadingService,
    private predictordbService: PredictordbService,
  ) { 
     // Observe the accountid var
     this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
    });   

  }


  getPredictors(): Observable<any> {
    // If var is empty, run query
    if (this.predictors.value.length == 0) {
      this.setPredictors();
  }
    // Return predictors
    return this.predictors.asObservable();
  }

  setPredictors(): void  {
    // Update predictors
    this.predictordbService.getAllByFacility(this.facilityid).then(
        data => {
          this.predictors.next(data);
        },
        error => {
            console.log(error);
        }
    );
  }

  addPredictor(dates) {
    // Add new header
    const name = "NAME " + Math.floor(Math.random() * 100);

    // add all backlog rows
        // Count how many in backlog
        // Get list of all month/years in system
        // Loop though list, add 
    //const backlog = [];
    
    for(var date of dates) {
      this.predictordbService.add(name,this.facilityid,this.accountid,date).then(
        data => {
          this.setPredictors(); // Refresh list of predictors
        },
        error => {
            console.log(error);
        }
      );
    }
  }

  addPredictorRow(currentPredictors, date) {
    // for each header, 
    // add new item
    for(var header of currentPredictors) {

      this.predictordbService.add(header,this.facilityid,this.accountid,date).then(
        data => {
          this.setPredictors(); // Refresh list of predictors
        },
        error => {
            console.log(error);
        }
      );
    }
  }

}
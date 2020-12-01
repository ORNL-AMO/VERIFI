import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';


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
    private predictordbService: PredictordbService,
  ) { 
    //  // Observe the accountid var
    //  this.accountService.getValue().subscribe((value) => {
    //   this.accountid = value;
    // });

    // // Observe the facilityid var
    // this.facilityService.getValue().subscribe((value) => {
    //   this.facilityid = value;
    // });   

  }

  // getPredictors(): Observable<Array<object>> {
  //   // If var is empty, run query
  //   if (this.predictors.value.length == 0) {
  //     this.setPredictors();
  // }
  //   // Return predictors
  //   return this.predictors.asObservable();
  // }

  // setPredictors(): void  {
  //   // Update predictors
  //   this.predictordbService.getAllByFacility(this.facilityid).then(
  //       data => {
  //         this.predictors.next(data);
  //       },
  //       error => {
  //           console.log(error);
  //       }
  //   );
  // }

  // addPredictor(dates, item): void {
  //   // Generate temp name
  //   const name = "New Predictor " + (item + 1);

  //   // Add all of the backlog dates to keep table uniform
  //   for(var date of dates) {
  //     this.predictordbService.add(name,this.facilityid,this.accountid,date).then(
  //       data => {},
  //       error => {
  //           console.log(error);
  //       }
  //     );
  //   }

  //   // Refresh list of predictors
  //   this.setPredictors(); 
  // }

  // addPredictorRow(currentPredictors, date): void {
  //   // for each header, add new item
  //   for(var header of currentPredictors) {

  //     this.predictordbService.add(header,this.facilityid,this.accountid,date).then(
  //       data => {},
  //       error => {
  //           console.log(error);
  //       }
  //     );
  //   }
    
  //   // Refresh list of predictors
  //   this.setPredictors(); 
  // }

  // deletePredictors(deleteQueue): void {
  //   // loop and delete each
  //   for(let i=0; i < deleteQueue.length; i++) {
  //     this.predictordbService.deleteIndex(deleteQueue[i]);
  //   }

  //   // Refresh list of predictors
  //   this.setPredictors(); 
  // }


  // updatePredictor(value): void {
  //   for (let i=0; i<value.length; i++) {
  //     this.predictordbService.update(value[i]).then(
  //       data => {},
  //       error => {
  //           console.log(error);
  //       }
  //     );
  //   }

  //   // Refresh list of predictors
  //   this.setPredictors(); 
  // }

  // getAllByName(name) {
  //   return this.predictordbService.getAllByName(name);
  // }

  // addPredictorByImport(obj): void {
  //   let counter = 1;

  //     this.predictordbService.add('name',this.facilityid,this.accountid,'date').then(
  //       id => {
  //         counter++;

  //         const importLine = {
  //           id: id,
  //           facilityid: this.facilityid,
  //           accountid: this.accountid,
  //           name: obj.name,
  //           desc: obj.desc,
  //           unit: obj.unit,
  //           date: obj.date,
  //           amount: obj.amount
  //         }

  //         this.predictordbService.update(importLine); // Update db

  //         /*if(counter === this.import.length) {
  //           this.utilityService.setMeterList(); // refresh the data
  //         }*/
          
  //       },
  //       error => {
  //           console.log(error);
  //       }
  //     );
  // }
}
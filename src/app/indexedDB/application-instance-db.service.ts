import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { ApplicationInstanceData, getNewApplicationInstanceData } from '../models/idbModels/applicationInstanceData';

@Injectable({
  providedIn: 'root'
})
export class ApplicationInstanceDbService {
  applicationInstanceData: BehaviorSubject<ApplicationInstanceData>;

  constructor(private dbService: NgxIndexedDBService) { 
    this.applicationInstanceData = new BehaviorSubject<ApplicationInstanceData>(undefined);
  }

  async initializeApplicationInstanceData(){
    let instanceData: Array<ApplicationInstanceData> = await firstValueFrom(this.getApplicationInstanceData());
    if(instanceData && instanceData.length > 0){
      console.log('exists');
      let instanceDataVal: ApplicationInstanceData = instanceData[0];
      instanceDataVal.appOpenCount++;
      instanceDataVal = await firstValueFrom(this.updateWithObservable(instanceDataVal));
      this.applicationInstanceData.next(instanceDataVal);
    }else{
      console.log("not exists");
      let newInstanceData: ApplicationInstanceData = getNewApplicationInstanceData();
      newInstanceData = await firstValueFrom(this.addWithObservable(newInstanceData));
      this.applicationInstanceData.next(newInstanceData);
    }
  }
  
  updateWithObservable(applicationinstancedata: ApplicationInstanceData): Observable<ApplicationInstanceData> {
    applicationinstancedata.modifiedDate = new Date();
    return this.dbService.update('application', applicationinstancedata);
  }

  addWithObservable(applicationinstancedata: ApplicationInstanceData): Observable<ApplicationInstanceData> {
    applicationinstancedata.createdDate = new Date();
    applicationinstancedata.modifiedDate = new Date();
    return this.dbService.add('application', applicationinstancedata);
  }

  getApplicationInstanceData(): Observable<any> {
    return this.dbService.getAll('application');
  }

  setSurveyDone(isDone = true) {
    let applicationInstanceData = this.applicationInstanceData.getValue();
    applicationInstanceData.isSurveyDone = isDone;
    applicationInstanceData.doSurveyReminder = !isDone;
    applicationInstanceData.isSurveyToastDone = true;
    return this.updateWithObservable(applicationInstanceData);
  }
  
  setSurveyToastDone() {
    let applicationInstanceData = this.applicationInstanceData.getValue();
    applicationInstanceData.isSurveyToastDone = true;
    return this.updateWithObservable(applicationInstanceData);
  }

}


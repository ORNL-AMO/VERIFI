import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom, Observable } from 'rxjs';
import { ApplicationInstanceData, getNewApplicationInstanceData } from '../models/idbModels/applicationInstanceData';

@Injectable({
  providedIn: 'root'
})
export class ApplicationInstanceDbService {
  constructor(private dbService: NgxIndexedDBService) { }

  async initializeApplicationInstanceData(): Promise<ApplicationInstanceData> {
    let instanceData: Array<ApplicationInstanceData> = await firstValueFrom(this.getApplicationInstanceData());
    if(instanceData && instanceData.length > 0){
      let instanceDataVal: ApplicationInstanceData = instanceData[0];
      instanceDataVal.appOpenCount++;
      instanceDataVal = await firstValueFrom(this.updateWithObservable(instanceDataVal));
      return instanceDataVal;
    }else{
      let newInstanceData: ApplicationInstanceData = getNewApplicationInstanceData();
      newInstanceData = await firstValueFrom(this.addWithObservable(newInstanceData));
      return newInstanceData;
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

  async setSurveyDone(isDone = true): Promise<ApplicationInstanceData> {
    let applicationInstanceData = await this.getStoredApplicationInstanceData();
    applicationInstanceData.isSurveyDone = isDone;
    applicationInstanceData.doSurveyReminder = !isDone;
    applicationInstanceData.isSurveyToastDone = true;
    return firstValueFrom(this.updateWithObservable(applicationInstanceData));
  }
  
  async setSurveyToastDone(): Promise<ApplicationInstanceData> {
    let applicationInstanceData = await this.getStoredApplicationInstanceData();
    applicationInstanceData.isSurveyToastDone = true;
    return firstValueFrom(this.updateWithObservable(applicationInstanceData));
  }

  private async getStoredApplicationInstanceData(): Promise<ApplicationInstanceData> {
    const records = await firstValueFrom(this.getApplicationInstanceData());
    if (!records?.[0]) { throw new Error('Application instance metadata has not been initialized.'); }
    return records[0];
  }

}

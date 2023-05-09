import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, Observable } from 'rxjs';
import { IdbOverviewReportOptions } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportOptionsDbService {
  /*Overview Report Options converted to Account Reports in v0.9.3,
     no longer used, to be deleted in future once old reports are converted  
  */
  constructor(private dbService: NgxIndexedDBService) {
  }


  getAll(): Observable<Array<IdbOverviewReportOptions>> {
    return this.dbService.getAll('overviewReportOptions');
  }

  async getAllAccountReports(accountId: string): Promise<Array<IdbOverviewReportOptions>>{
    let allOverviewReportOptions: Array<IdbOverviewReportOptions> = await firstValueFrom(this.getAll());
    let overviewReportOptions: Array<IdbOverviewReportOptions> = allOverviewReportOptions.filter(option => { return option.accountId == accountId });
    return overviewReportOptions;

  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('overviewReportOptions', id);
  }
}


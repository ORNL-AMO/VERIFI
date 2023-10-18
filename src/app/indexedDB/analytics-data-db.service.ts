import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { AppAnalyticsData } from '../analytics/analytics.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsDataDbService {

  constructor(private dbService: NgxIndexedDBService) { }

  getAppAnalyticsData(): Observable<Array<AppAnalyticsData>> {
    return this.dbService.getAll('analyticsData');
  }

  addWithObservable(data: AppAnalyticsData): Observable<any> {
    data.modifiedDate = new Date();
    return this.dbService.add('analyticsData', data);
  }

}

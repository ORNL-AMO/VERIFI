import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { UserSurvey } from 'src/app/models/userSurvey';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';
import { getMinutesBetweenDates } from '../sharedHelperFunctions';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  completedStatus: BehaviorSubject<'sending' | 'success' | 'error'>;
  userSurvey: BehaviorSubject<UserSurvey>;

  constructor(private httpClient: HttpClient,
    private accountDbService: AccountdbService
  ) {
    this.completedStatus = new BehaviorSubject<'sending' | 'success' | 'error'>(undefined);
    this.userSurvey = new BehaviorSubject<UserSurvey>(undefined);
  }

  /**
   * Check if is legacy user and has used app for 30 days 
   */
  checkIsExistingUser(): boolean {
    let currentDate = new Date();
    let accounts: Array<IdbAccount> = this.accountDbService.allAccounts.getValue();
    let accountDates: Array<Date> = accounts.map(acc => {
      return new Date(acc.createdDate);
    });
    let firstDate: Date = _.min(accountDates);
    if (firstDate) {
      let minutesBetween: number = getMinutesBetweenDates(firstDate, currentDate);
      let dateDifference: number = new ConvertValue(minutesBetween, 'min', 'd').convertedValue;
      return dateDifference >= 30;
    } else {
      return false;
    }
  }

  async sendAnswers() {
    let httpOptions = {
      responseType: 'text' as const,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    this.completedStatus.next('sending');
    let userSurvey: UserSurvey = this.userSurvey.getValue();
    let url: string = environment.measurUtilitiesApi + 'verifi-survey';
    this.httpClient.post(url, userSurvey, httpOptions).subscribe({
      next: (resp) => {
        this.setStatus(resp);
        this.userSurvey.next(undefined);
      },
      error: (error: any) => {
        this.setStatus(undefined, error);
      }
    });
  }

  setStatus(resp, error?: any) {
    if (resp === "Created") {
      this.completedStatus.next('success');
    } else if (error) {
      this.completedStatus.next('error');
    } else {
      this.completedStatus.next('error');
      console.error(error);
    }
  }
}

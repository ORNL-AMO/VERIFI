import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, firstValueFrom, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormControl, Validators } from '@angular/forms';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ApplicationInstanceDbService } from 'src/app/indexedDB/application-instance-db.service';
import { ApplicationInstanceData } from 'src/app/models/idbModels/applicationInstanceData';

@Injectable({
  providedIn: 'root'
})
export class EmailListSubscribeService {
  submittedStatus: BehaviorSubject<'error' | 'success' | 'sending'> = undefined;
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    responseType: 'json' as const,
  };

  API_URL = environment.measurUtilitiesApi + 'verifi-email-subscriber';
  constructor(private httpClient: HttpClient,
    private analyticsService: AnalyticsService,
    private applicationInstanceDbService: ApplicationInstanceDbService) {
    this.submittedStatus = new BehaviorSubject<'error' | 'success' | 'sending'>(undefined);
  }

  submitSubscriberEmail(email: string): Observable<void> {
    this.submittedStatus.next('sending');
    const subscriber: Subscriber = {
      email: email,
      name: email,
    };

    return this.httpClient.post<SubscriberResponse>(this.API_URL, subscriber, { ...this.httpOptions, observe: 'response' as const }).pipe(
      tap((resp: HttpResponse<SubscriberResponse>) => {
        this.analyticsService.sendEvent('email-list-subscribe');
        this.setStatus(resp.status);
      }),
      switchMap((resp: HttpResponse<SubscriberResponse>) => {
        const applicationInstanceData = this.applicationInstanceDbService.applicationInstanceData.getValue();
        if (resp.body && resp.body.id) {
          applicationInstanceData.subscriberId = resp.body.id;
          return this.applicationInstanceDbService.updateWithObservable(applicationInstanceData);
        }
        return of(applicationInstanceData);
      }),
      map(() => undefined),
      catchError(error => {
        this.setStatus(undefined, error);
        // return this.appErrorService.handleHttpError(error, 'submitSubscriberEmail')
        return throwError(() => error);
      })
    );
  }

  // todo eventuually get subscriber exists from list as part of obs chain
  async checkSubscriberExists(applicationData?: ApplicationInstanceData) {
    if (!applicationData) {
      applicationData = await firstValueFrom(this.applicationInstanceDbService.getApplicationInstanceData());
    }

    if (applicationData.subscriberId) {
      try {
        const resp = await firstValueFrom(this.httpClient.get(this.API_URL + `/${applicationData.subscriberId}`, { ...this.httpOptions, observe: 'response' }));
        return resp.status === 200 ? true : false;
      } catch (error: any) {
        // this.appErrorService.handleHttpError(error, 'checkSubscriberExists')
        console.log('Error checking subscriber exists', error);
        return false;
      }
    }
    return false;
  }

  checkEmailValid(subscriberEmail: string): string {
    const emailValidator = Validators.email;
    const emailControl = new FormControl(subscriberEmail);
    if (subscriberEmail && subscriberEmail.trim() !== '' && !emailValidator(emailControl)) {
      return undefined;
    } else {
      return 'Please enter a valid email address.';
    }
  }

  setStatus(status: number, error?: any) {
    if (status == 201 || status == 200) {
      this.submittedStatus.next('success');
    } else if (error && error.status === 400) {
      console.log('Bad Request', error);
      this.submittedStatus.next('error');
    } else {
      this.submittedStatus.next('error');
    }
  }
}

interface Subscriber {
  email: string,
  name: string,
}

interface SubscriberResponse {
  id: number;
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { FormControl, Validators } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { ApplicationInstanceDbService } from '@data/indexedDB/application-instance-db.service';
import { ApplicationInstanceData } from '@data/models/idbModels/applicationInstanceData';
import { AnalyticsService } from '@platform/analytics/analytics.service';
import { BehaviorSubject, catchError, firstValueFrom, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailListSubscribeService {
  submittedStatus = new BehaviorSubject<'error' | 'success' | 'sending' | undefined>(undefined);
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    }),
    responseType: 'json' as const
  };

  API_URL = environment.measurUtilitiesApi + 'verifi-email-subscriber';

  constructor(
    private httpClient: HttpClient,
    private analyticsService: AnalyticsService,
    private applicationInstanceDbService: ApplicationInstanceDbService,
    private applicationLifecycle: ApplicationLifecycleService
  ) { }

  submitSubscriberEmail(email: string): Observable<void> {
    this.submittedStatus.next('sending');
    const subscriber: Subscriber = {
      email,
      name: email
    };

    return this.httpClient.post<SubscriberResponse>(this.API_URL, subscriber, { ...this.httpOptions, observe: 'response' as const }).pipe(
      tap((resp: HttpResponse<SubscriberResponse>) => {
        this.analyticsService.sendEvent('email-list-subscribe');
        this.setStatus(resp.status);
      }),
      switchMap((resp: HttpResponse<SubscriberResponse>) => {
        const applicationInstanceData = this.applicationLifecycle.applicationMetadata();
        if (!applicationInstanceData) {
          return throwError(() => new Error('Application instance metadata is not ready.'));
        }
        if (resp.body?.id) {
          return from(this.applicationLifecycle.updateApplicationMetadata(current => ({
            ...current,
            subscriberId: resp.body.id
          })));
        }
        return of(applicationInstanceData);
      }),
      map(() => undefined),
      catchError(error => {
        this.setStatus(undefined, error);
        return throwError(() => error);
      })
    );
  }

  async checkSubscriberExists(applicationData?: ApplicationInstanceData): Promise<boolean> {
    const instanceData = applicationData || await firstValueFrom(this.applicationInstanceDbService.getApplicationInstanceData());

    if (instanceData.subscriberId) {
      try {
        const resp = await firstValueFrom(this.httpClient.get(this.API_URL + `/${instanceData.subscriberId}`, { ...this.httpOptions, observe: 'response' }));
        return resp.status === 200;
      } catch (error) {
        console.log('Error checking subscriber exists', error);
        return false;
      }
    }
    return false;
  }

  checkEmailValid(subscriberEmail: string | undefined): string | undefined {
    const emailValidator = Validators.email;
    const emailControl = new FormControl(subscriberEmail);
    if (subscriberEmail && subscriberEmail.trim() !== '' && !emailValidator(emailControl)) {
      return undefined;
    }
    return 'Please enter a valid email address.';
  }

  setStatus(status: number | undefined, error?: unknown): void {
    if (status === 201 || status === 200) {
      this.submittedStatus.next('success');
    } else if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
      console.log('Bad Request', error);
      this.submittedStatus.next('error');
    } else {
      this.submittedStatus.next('error');
    }
  }
}

interface Subscriber {
  email: string;
  name: string;
}

interface SubscriberResponse {
  id: number;
}

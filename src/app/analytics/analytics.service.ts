import { Injectable } from '@angular/core';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsDataDbService } from '../indexedDB/analytics-data-db.service';
import { environment } from 'src/environments/environment';
import { ElectronService } from '../electron/electron.service';
declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private clientId: string;
  analyticsSessionId: string;
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  constructor(private httpClient: HttpClient,
    private analyticsDataDbService: AnalyticsDataDbService,
    private electronService: ElectronService) {
    this.analyticsSessionId = uuidv4();
  }

  async setClientAnalyticsId() {
    let appAnalyticsData: Array<AppAnalyticsData> = await firstValueFrom(this.analyticsDataDbService.getAppAnalyticsData());
    let clientId: string;
    if (appAnalyticsData.length == 0) {
      clientId = uuidv4();
      await firstValueFrom(this.analyticsDataDbService.addWithObservable({
        clientId: clientId,
        modifiedDate: new Date()
      }));
    } else {
      clientId = appAnalyticsData[0].clientId;
    }
    this.setClientId(clientId);
  }

  async initAnalyticsSession(path: string) {
    await this.setClientAnalyticsId();
    let measurOpenEvent: GAEvent = {
      name: 'verifi_app_open',
      params: {
        verifi_platform: 'verifi-desktop',
        session_id: this.analyticsSessionId,
        // engagement_time_msec required to begin an analytics session but not used again
        engagement_time_msec: '100',
      }
    };
    this.postEventToMeasurementProtocol(measurOpenEvent);
    if (path) {
      this.sendAnalyticsPageView(path);
    }
  }

  async sendAnalyticsPageView(path: string) {
    if (!this.clientId) {
      await this.initAnalyticsSession(path);
    } else {
      let pageViewEvent: GAEvent = {
        name: 'page_view',
        params: {
          verifi_platform: 'verifi-desktop',
          page_path: path,
          session_id: this.analyticsSessionId
        }
      }
      this.postEventToMeasurementProtocol(pageViewEvent)
    }
  }

  async sendAnalyticsEvent(eventName: AnalyticsEventString, eventParams: EventParameters) {
    if (!this.clientId) {
      await this.initAnalyticsSession(undefined);
    } else {
      eventParams.session_id = this.analyticsSessionId;
      let pageViewEvent: GAEvent = {
        name: eventName,
        params: eventParams
      }
      this.postEventToMeasurementProtocol(pageViewEvent)
    }
  }

  postEventToMeasurementProtocol(gaEvent: GAEvent) {
    if (gaEvent.name === 'page_view') {
      this.setPageViewEventUrl(gaEvent);
    }

    let callDebuggingEndpoint = environment.production ? false : true;
    let postBody = {
      isDebugging: callDebuggingEndpoint,
      analyticsPayload: {
        client_id: this.clientId,
        non_personalized_ads: true,
        events: [
          gaEvent
        ]
      }
    }
    //TODO: gamp for MEASUR. Need script for VERIFI
    let url: string = environment.measurUtilitiesApi + 'gamp';
    if (environment.production) {
      this.httpClient.post<any>(url, postBody, this.httpOptions)
        .pipe(catchError(error => [])).subscribe({
          next: (resp) => {
            // GA Debugging endpoint returns response
            // GA prod endpoint returns null on success
          },
          error: (error: AnalyticsHttpError) => {
            // for now all errors fail silently
          }
        });
    }
  }

  setClientId(uuid: string) {
    this.clientId = uuid;
  }

  setPageViewEventUrl(pageViewEvent: GAEvent) {
    pageViewEvent.params.page_path = this.getPageWithoutId(pageViewEvent.params.page_path);
    // Never send real paths while in dev
    if (!environment.production) {
      pageViewEvent.params.page_path = '/testing'
    }
  }

  getPageWithoutId(pagePath: string) {
    let pathWithoutId: string = pagePath.replace(/[0-9]/g, '');
    pathWithoutId = pathWithoutId.replace(/\/$/, "");
    pathWithoutId = pathWithoutId.replace("//", "/:id/");
    return pathWithoutId;
  }

  sendEvent(eventName: AnalyticsEventString, path?: string) {
    if (environment.production) {
      if (!this.electronService.isElectron) {
        let eventParams: EventParameters = {
          page_path: path,
          verifi_platform: 'verifi-web',
          session_id: undefined
        }
        gtag('event', eventName, eventParams);
      } else if (path) {
        this.sendAnalyticsPageView(path)
      } else {
        let eventParams: EventParameters = {
          page_path: path,
          verifi_platform: 'verifi-desktop',
          session_id: undefined
        }
        this.sendAnalyticsEvent(eventName, eventParams);
      }
    }
  }

}

export class AnalyticsHttpError extends Error { }

export interface AnalyticsPayload {
  client_id: string,
  user_id?: string,
  non_personalized_ads: boolean,
  events: Array<{ name: string, params: object }>
}

export interface GAEvent {
  name: AnalyticsEventString,
  params: EventParameters
}

export interface EventParameters {
  page_path?: string,
  verifi_platform?: VerifiPlatformString,
  session_id: string,
  engagement_time_msec?: string,
}

export type AnalyticsEventString = 'page_view' | 'verifi_app_open' | 'import_backup_file' | 'create_account_analysis' | 'create_facility_analysis' | 'create_account' | 'create_report';
export type VerifiPlatformString = 'verifi-desktop' | 'verifi-web';

export interface AppAnalyticsData {
  clientId: string,
  modifiedDate: Date
}
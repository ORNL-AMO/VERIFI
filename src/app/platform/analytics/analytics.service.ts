import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';
import { catchError, firstValueFrom, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsDataDbService } from '@data/indexedDB/analytics-data-db.service';
import { environment } from 'src/environments/environment';
import { ElectronService } from '@platform/electron/electron.service';
import { analyticsRoutePath, isAnalyticsRouteAllowed } from './analytics-policy';

const MEASUREMENT_ID = 'G-YG1QD02XSE';
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private clientId: string;
  private clientInitialization: Promise<void>;
  private routeSubscription: Subscription;
  private committedPath: string;
  private pendingNavigationId: number;
  private navigationRevision = 0;
  private applicationOpened = false;
  private tagInitialized = false;
  private pageReferrer: string;
  readonly analyticsSessionId = uuidv4();
  readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private httpClient: HttpClient,
    private analyticsDataDbService: AnalyticsDataDbService,
    private electronService: ElectronService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.pageReferrer = isAnalyticsRouteAllowed(document.referrer) ? document.referrer : '';
  }

  /** Start before initial navigation; no collection is allowed until it commits. */
  initialize(): void {
    if (this.routeSubscription) {
      return;
    }
    this.updateBrowserCollection();
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.pendingNavigationId = event.id;
        this.navigationRevision++;
        this.updateBrowserCollection();
      } else if (event instanceof NavigationEnd) {
        if (this.pendingNavigationId !== undefined && event.id !== this.pendingNavigationId) {
          return;
        }
        this.pendingNavigationId = undefined;
        if (this.committedPath !== undefined) {
          this.pageReferrer = isAnalyticsRouteAllowed(this.committedPath)
            ? 'https://verifi.ornl.gov' + this.getPageWithoutId(this.committedPath) : '';
        }
        this.committedPath = event.urlAfterRedirects;
        this.navigationRevision++;
        this.updateBrowserCollection();
        if (this.canCollect()) {
          if (!this.applicationOpened) {
            this.sendEvent('verifi_app_open');
          }
          this.sendEvent('page_view', this.getPageWithoutId(this.committedPath));
        }
      } else if (event instanceof NavigationSkipped) {
        // A redirect back to the current URL can be skipped without a NavigationStart.
        if (this.pendingNavigationId !== undefined && event.id < this.pendingNavigationId) {
          return;
        }
        this.pendingNavigationId = undefined;
        this.navigationRevision++;
        this.updateBrowserCollection();
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        if (event.id !== this.pendingNavigationId) {
          return;
        }
        // Redirects and superseded navigations must stay blocked until their successor commits.
        if (event instanceof NavigationCancel &&
          (event.code === NavigationCancellationCode.Redirect || event.code === NavigationCancellationCode.SupersededByNewNavigation)) {
          return;
        }
        this.pendingNavigationId = undefined;
        this.navigationRevision++;
        this.updateBrowserCollection();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.committedPath = undefined;
    this.updateBrowserCollection();
  }

  private canCollect(path?: string): boolean {
    const location = this.document.defaultView?.location;
    return environment.analyticsEnabled &&
      (this.electronService.isElectron ||
        (location?.hostname === 'verifi.ornl.gov' && location.protocol === 'https:')) &&
      this.pendingNavigationId === undefined &&
      this.committedPath !== undefined && isAnalyticsRouteAllowed(this.committedPath) &&
      (!path || isAnalyticsRouteAllowed(path));
  }

  private updateBrowserCollection(): void {
    const browser = this.document.defaultView as AnalyticsWindow;
    if (!browser) {
      return;
    }
    const enabled = !this.electronService.isElectron && this.canCollect();
    if (!enabled) {
      browser[DISABLE_KEY] = true;
      return;
    }
    const pageParameters = {
      page_location: 'https://verifi.ornl.gov' + this.getPageWithoutId(this.committedPath),
      page_referrer: this.pageReferrer
    };
    if (this.tagInitialized) {
      browser.gtag?.('set', pageParameters);
      browser[DISABLE_KEY] = false;
      return;
    }
    browser[DISABLE_KEY] = false;
    this.tagInitialized = true;
    browser.dataLayer = browser.dataLayer || [];
    browser.gtag = function () { browser.dataLayer.push(arguments); };
    browser.gtag('js', new Date());
    // Global defaults can be refreshed on navigation; config-scoped values would override them.
    browser.gtag('set', pageParameters);
    browser.gtag('config', MEASUREMENT_ID, { send_page_view: false });
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    this.document.head.appendChild(script);
  }

  async setClientAnalyticsId(): Promise<void> {
    const data: AppAnalyticsData[] = await firstValueFrom(this.analyticsDataDbService.getAppAnalyticsData());
    if (data.length) {
      this.setClientId(data[0].clientId);
    } else {
      const clientId = uuidv4();
      await firstValueFrom(this.analyticsDataDbService.addWithObservable({ clientId, modifiedDate: new Date() }));
      this.setClientId(clientId);
    }
  }

  async initAnalyticsSession(path?: string): Promise<void> {
    if (!this.canCollect(path)) {
      return;
    }
    const revision = this.navigationRevision;
    await this.sendAnalyticsEvent('verifi_app_open', { session_id: this.analyticsSessionId });
    if (path && revision === this.navigationRevision) {
      await this.sendAnalyticsPageView(path);
    }
  }

  async sendAnalyticsPageView(path: string): Promise<void> {
    await this.sendAnalyticsEvent('page_view', {
      page_path: path,
      session_id: this.analyticsSessionId
    });
  }

  async sendAnalyticsEvent(eventName: AnalyticsEventString, eventParams: EventParameters): Promise<void> {
    if (!this.electronService.isElectron || !this.canCollect(eventParams.page_path)) {
      return;
    }
    const revision = this.navigationRevision;
    if (!this.clientId) {
      this.clientInitialization ??= this.setClientAnalyticsId().finally(() => {
        this.clientInitialization = undefined;
      });
      await this.clientInitialization;
    }
    // Never replay an event against a different route after storage initialization.
    if (revision !== this.navigationRevision || !this.canCollect(eventParams.page_path)) {
      return;
    }
    if (!this.applicationOpened) {
      this.postEventToMeasurementProtocol({
        name: 'verifi_app_open',
        params: {
          verifi_platform: 'verifi-desktop',
          session_id: this.analyticsSessionId,
          engagement_time_msec: '100'
        }
      });
      this.applicationOpened = true;
    }
    if (eventName !== 'verifi_app_open') {
      this.postEventToMeasurementProtocol({
        name: eventName,
        params: { ...eventParams, verifi_platform: 'verifi-desktop', session_id: this.analyticsSessionId }
      });
    }
  }

  postEventToMeasurementProtocol(gaEvent: GAEvent): void {
    if (!this.electronService.isElectron || !this.canCollect(gaEvent.params.page_path)) {
      return;
    }
    if (gaEvent.name === 'page_view') {
      this.setPageViewEventUrl(gaEvent);
    }
    this.httpClient.post(environment.measurUtilitiesApi + 'gamp', {
      isDebugging: false,
      isVerifi: true,
      analyticsPayload: {
        client_id: this.clientId,
        non_personalized_ads: true,
        events: [gaEvent]
      }
    }, this.httpOptions).pipe(catchError(() => [])).subscribe();
  }

  setClientId(uuid: string): void {
    this.clientId = uuid;
  }

  setPageViewEventUrl(pageViewEvent: GAEvent): void {
    pageViewEvent.params.page_path = this.getPageWithoutId(pageViewEvent.params.page_path);
    pageViewEvent.params.page_location = 'https://verifi.ornl.gov' + pageViewEvent.params.page_path;
  }

  getPageWithoutId(pagePath: string): string {
    // Replace custom GUIDs; query strings and fragments are not analytics routes.
    return analyticsRoutePath(pagePath).split('/')
      .map(segment => /^[a-z0-9]{9}$/.test(segment) ? ':id' : segment)
      .join('/') || '/';
  }

  sendEvent(eventName: AnalyticsEventString, path?: string): void {
    if (!this.canCollect(path)) {
      return;
    }
    if (this.electronService.isElectron) {
      void this.sendAnalyticsEvent(eventName, {
        page_path: path,
        session_id: this.analyticsSessionId
      }).catch(() => undefined);
    } else {
      if (eventName === 'verifi_app_open' && this.applicationOpened) {
        return;
      }
      const pagePath = this.getPageWithoutId(path || this.committedPath);
      const browser = this.document.defaultView as AnalyticsWindow;
      browser.gtag?.('event', eventName, {
        page_path: pagePath,
        page_location: 'https://verifi.ornl.gov' + pagePath,
        // Do not attach an excluded route as the referrer after returning to legacy UI.
        page_referrer: this.pageReferrer,
        verifi_platform: 'verifi-web'
      });
      if (eventName === 'verifi_app_open') {
        this.applicationOpened = true;
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
  page_location?: string,
  verifi_platform?: VerifiPlatformString,
  session_id: string,
  engagement_time_msec?: string,
}

export type AnalyticsEventString = 'page_view' |
  'verifi_app_open' |
  'import_backup_file' |
  'create_account_analysis' |
  'create_facility_analysis' |
  'create_account' |
  'create_report' |
  'use_data_visualization' |
  'weather_data_predictors' |
  'email-list-subscribe';

export type VerifiPlatformString = 'verifi-desktop' | 'verifi-web';

export interface AppAnalyticsData {
  clientId: string,
  modifiedDate: Date
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getGUID } from 'src/app/shared/sharedHelperFuntions';

@Injectable({
  providedIn: 'root'
})
export class ToastNotificationsService {

  toastNotification: BehaviorSubject<ToastNotification>;
  disableNotification: BehaviorSubject<boolean>;

  constructor() {
    this.toastNotification = new BehaviorSubject<ToastNotification>(undefined);
    this.disableNotification = new BehaviorSubject<boolean>(undefined);
  }

  showToast(title: string, body: string, setTimeoutVal: number, showDisableFooter: boolean, toastClass: ToastClass, confetti?: boolean) {
    this.toastNotification.next({
      title: title,
      body: body,
      setTimeoutVal: setTimeoutVal,
      showDisableFooter: showDisableFooter,
      toastClass: toastClass,
      confetti: confetti,
      guid: getGUID()
    });
  }

  hideToast() {
    this.disableNotification.next(undefined);
    this.toastNotification.next(undefined);
  }

  weatherDataErrorToast() {
    this.showToast('Error Calculating Weather Data', 'An error occured while calculating weather data.', undefined, false, 'alert-danger')
  }

}


export interface ToastNotification {
  title: string,
  guid: string,
  body: string,
  setTimeoutVal: number,
  showDisableFooter: boolean,
  toastClass: ToastClass,
  confetti?: boolean
}

export type ToastClass = "alert-primary" | "alert-secondary" | "alert-success" | "alert-danger" | "alert-warning" | "alert-info" | "alert-light" | "alert-dark";
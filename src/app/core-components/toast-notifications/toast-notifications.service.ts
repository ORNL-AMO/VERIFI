import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  showToast(title: string, body: string, setTimeoutVal: number, showDisableFooter: boolean, toastClass: "bg-success" | "bg-warning" | "bg-info" | "bg-danger", confetti?: boolean) {
    this.toastNotification.next({
      title: title,
      body: body,
      setTimeoutVal: setTimeoutVal,
      showDisableFooter: showDisableFooter,
      toastClass: toastClass,
      confetti: confetti
    });
  }

  hideToast() {
    this.disableNotification.next(undefined);
    this.toastNotification.next(undefined);
  }
}


export interface ToastNotification {
  title: string,
  body: string,
  setTimeoutVal: number,
  showDisableFooter: boolean,
  toastClass: "bg-success" | "bg-warning" | "bg-info" | "bg-danger",
  confetti?: boolean
}
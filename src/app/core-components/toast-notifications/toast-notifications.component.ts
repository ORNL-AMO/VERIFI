import { Component, OnInit, Input, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToastNotification, ToastNotificationsService } from './toast-notifications.service';
import { Subscription } from 'rxjs';
import * as confetti from 'canvas-confetti';
// import * as bootstrap from 'bootstrap'
declare var bootstrap: any;
@Component({
  selector: 'app-toast-notifications',
  templateUrl: './toast-notifications.component.html',
  styleUrls: ['./toast-notifications.component.css'],
  animations: [
    trigger('toast', [
      state('show', style({ bottom: '40px' })),
      state('hide', style({ bottom: '-200px' })),
      transition('hide => show', animate('.5s ease')),
      transition('show => hide', animate('.5s ease'))
    ])
  ]
})
export class ToastNotificationsComponent implements OnInit {

  @ViewChild('canvasElement', { static: false }) canvasElement: ElementRef;
  @ViewChild('toastElement', { static: false }) toastElement: ElementRef;

  toastNotification: ToastNotification;
  toastNotificationSub: Subscription;
  toast: any;
  constructor(private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit() {
    this.toastNotificationSub = this.toastNotificationsService.toastNotification.subscribe(val => {
      // this.toastNotification = val;
      // this.createToast();
    });
  }

  ngAfterViewInit() {
    // this.createToast();
  }


  ngOnDestroy() {
    this.toastNotificationSub.unsubscribe();
  }


  createToast() {
    this.disposeToast();
    if (this.toastNotification && this.toastElement) {
      this.toast = new bootstrap.Toast(this.toastElement.nativeElement)
      this.toast.show();
      if (this.toastNotification.confetti) {
        this.createConfetti();
      }
      if (this.toastNotification.setTimeoutVal) {
        setTimeout(() => {
          this.closeToast();
        }, this.toastNotification.setTimeoutVal);
      } else {
        setTimeout(() => {
          this.closeToast();
        }, 2000);
      }
    };

  }

  disposeToast() {
    if (this.toast && this.toastElement) {
      console.log(this.toast);
      console.log('dispose');
      this.toast.dispose();
    }
  }


  closeToast() {
    this.toastNotificationsService.disableNotification.next(false);
    this.toastNotificationsService.hideToast();
  }

  //TODO: Disable logic whenever we want to have something disabled
  disable() {
    this.toastNotificationsService.disableNotification.next(true);
    this.toastNotificationsService.hideToast();
  }

  createConfetti() {
    if (this.canvasElement) {
      confetti.create(this.canvasElement.nativeElement)({
        particleCount: 500,
        spread: 90,
        scalar: .5,
        origin: { y: 1, x: 1 }
      });
    }
  }
}

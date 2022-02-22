import { Component, OnInit, Input, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToastNotification, ToastNotificationsService } from './toast-notifications.service';
import { Subscription } from 'rxjs';
import * as confetti from 'canvas-confetti';

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
  showToast: string = 'hide';
  destroyToast: boolean = true;

  toastNotification: ToastNotification;
  toastNotificationSub: Subscription;
  constructor(private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit() {
    this.toastNotificationSub = this.toastNotificationsService.toastNotification.subscribe(val => {
      this.toastNotification = val;
      this.destroyToast = (val == undefined);
      if (this.toastNotification) {
        setTimeout(() => {
          this.showToast = 'show';
          if(this.toastNotification.confetti){
            this.createConfetti();
          }
        }, 100);

        if (this.toastNotification.setTimeoutVal) {
          setTimeout(() => {
            this.closeToast();
          }, this.toastNotification.setTimeoutVal);
        }else{
          setTimeout(() => {
            this.closeToast();
          }, 2000);
        }

      }
    });
  }

  ngOnDestroy() {
    this.toastNotificationSub.unsubscribe();
  }


  closeToast() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.destroyToast = true;
      this.toastNotificationsService.disableNotification.next(false);
      this.toastNotificationsService.hideToast();
    }, 500);
  }

  //TODO: Disable logic whenever we want to have something disabled
  disable() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.destroyToast = true;
      this.toastNotificationsService.disableNotification.next(true);
      this.toastNotificationsService.hideToast();
    }, 500);
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

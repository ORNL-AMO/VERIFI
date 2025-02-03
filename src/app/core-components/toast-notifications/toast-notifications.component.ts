import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
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
            state('show', style({ bottom: '0px' })),
            state('hide', style({ bottom: '-200px' })),
            transition('hide => show', animate('.5s ease')),
            transition('show => hide', animate('.5s ease'))
        ])
    ],
    standalone: false
})
export class ToastNotificationsComponent implements OnInit {

  @ViewChild('canvasElement', { static: false }) canvasElement: ElementRef;

  toastNotification: ToastNotification;
  toastNotificationSub: Subscription;

  showToast: 'show' | 'hide' = 'hide';
  destroyToast: boolean = true;
  constructor(private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit() {
    this.toastNotificationSub = this.toastNotificationsService.toastNotification.subscribe(val => {
      this.toastNotification = val;
      this.createToast();
    });
  }

  ngAfterViewInit() {
    this.createToast();
  }

  ngOnDestroy() {
    this.toastNotificationSub.unsubscribe();
  }


  createToast() {
    if (this.toastNotification) {
      this.destroyToast = false;
      setTimeout(() => {
        this.showToast = 'show';
        if (this.toastNotification.confetti) {
          this.createConfetti();
        }
      }, 100);
      if (this.toastNotification.setTimeoutVal) {
        setTimeout(() => {
          this.closeToast();
        }, this.toastNotification.setTimeoutVal);
      } else {
        setTimeout(() => {
          this.closeToast();
        }, 3000);
      }
    };

  }

  closeToast() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.toastNotificationsService.disableNotification.next(false);
      this.toastNotificationsService.hideToast();
      this.destroyToast = false;
    }, 100);
  }

  disable() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.toastNotificationsService.disableNotification.next(true);
      this.toastNotificationsService.hideToast();
      this.destroyToast = false;
    }, 100);
  }

  createConfetti() {
    if (this.canvasElement) {
      confetti.create(this.canvasElement.nativeElement)({
        particleCount: 500,
        spread: 90,
        scalar: .5,
        origin: { y: 1, x: 1 }
      });
      console.log(confetti);
    }
  }
}

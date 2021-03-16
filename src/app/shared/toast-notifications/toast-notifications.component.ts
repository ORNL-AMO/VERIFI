import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToastNotification, ToastNotificationsService } from './toast-notifications.service';
import { Subscription } from 'rxjs';

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
  @Input()
  title: string;
  @Input()
  body: string;
  @Output('emitCloseToast')
  emitCloseToast = new EventEmitter<boolean>();
  @Input()
  setTimeoutVal: number;
  @Input()
  toastClass: string;
  @Input()
  showDisableFooter: boolean;
  @Output('emitDisable')
  emitDisable = new EventEmitter<boolean>();

  showToast: string = 'hide';
  destroyToast: boolean = false;

  toastNotification: ToastNotification;
  toastNotificationSub: Subscription;
  constructor(private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit() {

    this.toastNotificationSub = this.toastNotificationsService.toastNotification.subscribe(val => {
      this.toastNotification = val;
    });

    setTimeout(() => {
      this.showToast = 'show';
    }, 100);

    if (this.setTimeoutVal) {
      setTimeout(() => {
        this.closeToast();
      }, this.setTimeoutVal);
    }
  }

  ngOnDestroy(){
    this.toastNotificationSub.unsubscribe();
  }


  closeToast() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.destroyToast = true;
      this.emitCloseToast.emit(true);
    }, 500);
  }

  disable() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.destroyToast = true;
      this.emitDisable.emit(true);
    }, 500);
  }
}

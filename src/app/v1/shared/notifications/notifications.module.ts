import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ToastHostComponent } from './toast-host.component';

@NgModule({
  declarations: [ToastHostComponent],
  imports: [CommonModule],
  exports: [ToastHostComponent]
})
export class NotificationsModule { }

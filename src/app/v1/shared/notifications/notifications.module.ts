import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ToastHostComponent } from './toast-host.component';

@NgModule({
  declarations: [ToastHostComponent],
  imports: [CommonModule, IconsModule],
  exports: [ToastHostComponent]
})
export class NotificationsModule { }

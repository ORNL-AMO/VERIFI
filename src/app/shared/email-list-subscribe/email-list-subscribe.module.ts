import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailListSubscribeComponent } from './email-list-subscribe.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    EmailListSubscribeComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    EmailListSubscribeComponent
  ]
})
export class EmailListSubscribeModule { }

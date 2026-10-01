import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailListSubscribeComponent } from '@v0/shared/email-list-subscribe/email-list-subscribe.component';
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

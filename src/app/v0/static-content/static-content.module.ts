import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from '@v0/static-content/about/about.component';
import { AcknowledgmentsComponent } from '@v0/static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from '@v0/static-content/feedback/feedback.component';
import { HelpComponent } from '@v0/static-content/help/help.component';
import { PrivacyNoticeComponent } from '@v0/static-content/privacy-notice/privacy-notice.component';
import { EmailListSubscribeModule } from '@v0/shared/email-list-subscribe/email-list-subscribe.module';

@NgModule({
  declarations: [
    AboutComponent,
    AcknowledgmentsComponent,
    FeedbackComponent,
    HelpComponent,
    PrivacyNoticeComponent
  ],
  imports: [
    CommonModule,
    EmailListSubscribeModule
  ]
})
export class StaticContentModule { }

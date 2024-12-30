import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about/about.component';
import { AcknowledgmentsComponent } from './acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { HelpComponent } from './help/help.component';
import { PrivacyNoticeComponent } from './privacy-notice/privacy-notice.component';
import { UserSurveyModule } from '../shared/user-survey/user-survey.module';

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
    UserSurveyModule
  ]
})
export class StaticContentModule { }

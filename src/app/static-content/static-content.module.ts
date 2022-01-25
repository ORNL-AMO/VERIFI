import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about/about.component';
import { AcknowledgmentsComponent } from './acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { HelpComponent } from './help/help.component';
import { StyleGuideComponent } from './style-guide/style-guide.component';



@NgModule({
  declarations: [
    AboutComponent,
    AcknowledgmentsComponent,
    FeedbackComponent,
    HelpComponent,
    StyleGuideComponent
  ],
  imports: [
    CommonModule
  ]
})
export class StaticContentModule { }

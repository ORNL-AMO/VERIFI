import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserSurveyComponent } from './user-survey.component';
import { ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    UserSurveyComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  exports: [
    UserSurveyComponent
  ]
})
export class UserSurveyModule { }

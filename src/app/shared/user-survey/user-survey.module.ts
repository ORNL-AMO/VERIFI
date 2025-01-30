import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserSurveyComponent } from './user-survey.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    UserSurveyComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HelperPipesModule
  ],
  exports: [
    UserSurveyComponent
  ]
})
export class UserSurveyModule { }

import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApplicationInstanceDbService } from 'src/app/indexedDB/application-instance-db.service';
import { UserSurvey } from 'src/app/models/userSurvey';
import { SurveyService } from 'src/app/shared/helper-services/survey.service';

@Component({
  selector: 'app-user-survey',
  templateUrl: './user-survey.component.html',
  styleUrl: './user-survey.component.css',
  standalone: false
})
export class UserSurveyComponent {
  @Input()
  inModal: boolean;

  userSurvey: UserSurvey;
  completedStatus: "success" | "error" | 'sending';

  userSurveyForm: FormGroup;
  statusSub: Subscription;
  constructor(
    private surveyService: SurveyService,
    private router: Router,
    private applicationInstanceDbService: ApplicationInstanceDbService,
    private fb: FormBuilder) { }

  ngOnInit() {
    this.initForm();
    this.statusSub = this.surveyService.completedStatus.subscribe(status => {
      this.completedStatus = status;
      if (this.completedStatus === 'success' && !this.inModal) {
        this.setSurveyDone();
      }
    });

  }

  ngOnDestroy() {
    this.statusSub.unsubscribe();
  }

  initForm() {
    const defaultFormData = this.getDefaultForm();
    this.userSurveyForm = this.fb.group({
      email: [defaultFormData.email, [Validators.email]],
      companyName: [defaultFormData.companyName, []],
      contactName: [defaultFormData.contactName, []],
      usefulRating: [defaultFormData.usefulRating, []],
      recommendRating: [defaultFormData.recommendRating, []],
      questionDescribeSuccess: [defaultFormData.questionDescribeSuccess, [Validators.maxLength(2048)]],
      hasProfilingInterest: [defaultFormData.hasProfilingInterest, []],
      questionFeedback: [defaultFormData.questionFeedback, [Validators.maxLength(2048)]],
    });
    this.surveyService.completedStatus.next(undefined)
    this.surveyService.userSurvey.next(undefined)
  }

  async setSurveyDone() {
    let appData = await firstValueFrom(this.applicationInstanceDbService.setSurveyDone());
    this.applicationInstanceDbService.applicationInstanceData.next(appData);
  }

  setRatingValue(controlName: string, val: number) {
    this.userSurveyForm.get(controlName)?.patchValue(val);
    this.save();
  }

  save() {
    if (this.userSurveyForm.controls.email.valid) {
      this.surveyService.userSurvey.next(this.getSurveyFromForm())
    } else {
      this.surveyService.userSurvey.next(undefined)
    }
  }

  sendAnswers() {
    this.surveyService.sendAnswers();
  }

  getRemainingCharacters(controlName: string): number {
    let textLength = this.userSurveyForm.get(controlName).value?.length || 0;
    let charactersRemaining = 2048 - textLength;
    return charactersRemaining;
  }

  getDefaultForm() {
    return {
      email: undefined,
      companyName: undefined,
      contactName: undefined,
      usefulRating: 0,
      recommendRating: 0,
      questionDescribeSuccess: undefined,
      hasProfilingInterest: false,
      questionFeedback: undefined,
    }
  }

  getSurveyFromForm(): UserSurvey {
    return {
      email: this.userSurveyForm.controls.email.value,
      companyName: this.userSurveyForm.controls.companyName.value,
      contactName: this.userSurveyForm.controls.contactName.value,
      usefulRating: this.userSurveyForm.controls.usefulRating.value,
      recommendRating: this.userSurveyForm.controls.recommendRating.value,
      questionDescribeSuccess: this.userSurveyForm.controls.questionDescribeSuccess.value,
      hasProfilingInterest: this.userSurveyForm.controls.hasProfilingInterest.value,
      questionFeedback: this.userSurveyForm.controls.questionFeedback.value,
    }
  }

  navigateToPrivacyNotice() {
    this.surveyService.showSurveyModal.next(false);
    this.router.navigate(['/privacy']);
  }

  async setRemindAndClose() {
    await firstValueFrom(this.applicationInstanceDbService.setSurveyDone(false));
    this.surveyService.showSurveyModal.next(false);
  }

  close() {
    this.surveyService.showSurveyModal.next(false);
  }
}
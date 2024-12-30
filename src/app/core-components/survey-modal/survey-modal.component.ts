import { ChangeDetectorRef, Component } from '@angular/core';
import { SurveyService } from 'src/app/shared/helper-services/survey.service';

@Component({
  selector: 'app-survey-modal',
  templateUrl: './survey-modal.component.html',
  styleUrl: './survey-modal.component.css'
})
export class SurveyModalComponent {

  showModal: boolean = false;

  constructor(private cd: ChangeDetectorRef, private surveyService: SurveyService) {

  }

  ngAfterViewInit() {
    this.showModal = true;
    this.cd.detectChanges();
  }

  close() {
    this.showModal = false;
    this.surveyService.showSurveyModal.next(false);
  }
}

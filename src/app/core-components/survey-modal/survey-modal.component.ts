import { Component } from '@angular/core';

@Component({
  selector: 'app-survey-modal',
  templateUrl: './survey-modal.component.html',
  styleUrl: './survey-modal.component.css'
})
export class SurveyModalComponent {

  showModal: boolean = false;

  ngAfterViewInit(){
    this.showModal = true;
  }

  close(){

  }

  submitSurvey(){

  }
}

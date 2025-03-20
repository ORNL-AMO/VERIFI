import { Component } from '@angular/core';

@Component({
  selector: 'app-setup-checklist',
  standalone: false,

  templateUrl: './setup-checklist.component.html',
  styleUrl: './setup-checklist.component.css'
})
export class SetupChecklistComponent {


  step: 'accountDetails' | 'uploadData' | 'facilityDetails' | 'meterData' | 'predictorData' | 'repeatSteps' | 'portfolio' | 'instructions' = 'instructions';


  setStep(val: 'accountDetails' | 'uploadData' | 'facilityDetails' | 'meterData' | 'predictorData' | 'repeatSteps' | 'portfolio' | 'instructions') {
    this.step = val;
  }
}

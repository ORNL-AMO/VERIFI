import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setup-checklist',
  standalone: false,

  templateUrl: './setup-checklist.component.html',
  styleUrl: './setup-checklist.component.css'
})
export class SetupChecklistComponent {


  step: 'accountDetails' | 'uploadData' | 'facilityDetails' | 'meterData' | 'predictorData' | 'repeatSteps' | 'portfolio' | 'instructions' = 'instructions';
  constructor(private router: Router) {
  }

  setStep(val: 'accountDetails' | 'uploadData' | 'facilityDetails' | 'meterData' | 'predictorData' | 'repeatSteps' | 'portfolio' | 'instructions') {
    this.step = val;
  }

  goToPortfolio() {
    this.router.navigateByUrl('/account/home')
  }
}

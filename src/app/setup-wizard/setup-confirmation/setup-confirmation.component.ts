import { Component, OnInit } from '@angular/core';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-confirmation',
  templateUrl: './setup-confirmation.component.html',
  styleUrls: ['./setup-confirmation.component.css']
})
export class SetupConfirmationComponent implements OnInit {

  account: IdbAccount;
  facilities: Array<IdbFacility>;
  hasTemplate: boolean;

  setupSummaries: Array<SetupSummaryItem>;
  constructor(private setupWizardService: SetupWizardService,
    private settingsFormService: SettingsFormsService) { }

  ngOnInit(): void {
    this.account = this.setupWizardService.account.getValue();
    this.facilities = this.setupWizardService.facilities.getValue();
    this.hasTemplate = this.setupWizardService.facilityTemplateWorkbook.getValue() != undefined;
    this.setSummary();
  }


  setSummary(){
    let setupSummaries: Array<SetupSummaryItem> = new Array();
    //account
    let accountSummary: SetupSummaryItem = this.getSummary(this.account, 'Corporate Account: ' + this.account.name);
    setupSummaries.push(accountSummary);
    this.facilities.forEach(facility => {
      let facilitySummary: SetupSummaryItem = this.getSummary(facility, 'Facility: ' + facility.name);
      setupSummaries.push(facilitySummary);
    });
    this.setupSummaries = setupSummaries;
  }

  getSummary(accountOrFacility: IdbFacility | IdbAccount, label: string): SetupSummaryItem{
    let unitsValid: boolean = this.settingsFormService.getUnitsForm(accountOrFacility).valid;
    let reportingValid: boolean = this.settingsFormService.getSustainabilityQuestionsForm(accountOrFacility).valid;
    let generalInformationValid: boolean = this.settingsFormService.getGeneralInformationForm(accountOrFacility).valid;
    let generalInformationErrors: Array<string> = new Array();
    if(!generalInformationValid){
      generalInformationErrors.push('Errors found in general information form');
    }else if(!accountOrFacility.zip){
      generalInformationErrors.push('Zip code needed for electrical emissions factors.');
    }
    let missingEmissions: boolean = !accountOrFacility.eGridSubregion;
    let unitsErrors: Array<string> = new Array();
    if(missingEmissions){
      unitsErrors.push('Missing electrical emissions region.')
    }
    let missingEnergyReductionGoal: boolean = !accountOrFacility.sustainabilityQuestions.energyReductionGoal;
    let reportingErrors: Array<string> = new Array();
    if(missingEnergyReductionGoal){
      reportingErrors.push('No energy reduction goal set');
    }

    return {
      label: label,
      generalInformationValid: generalInformationValid,
      generalInformationErrors: generalInformationErrors,
      unitsValid: unitsValid,
      unitsErrors: unitsErrors,
      reportingValid: reportingValid,
      reportingErrors: reportingErrors
    }
  }
  
  submitAccount() {
    this.setupWizardService.submit.next(true);
  }
}


export interface SetupSummaryItem {
  label: string,
  generalInformationValid: boolean,
  generalInformationErrors: Array<string>,
  unitsValid: boolean,
  unitsErrors: Array<string>,
  reportingValid: boolean,
  reportingErrors: Array<string>
}
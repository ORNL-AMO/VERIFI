import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-wizard-banner',
  templateUrl: './setup-wizard-banner.component.html',
  styleUrls: ['./setup-wizard-banner.component.css']
})
export class SetupWizardBannerComponent implements OnInit {

  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  account: IdbAccount;
  accountSub: Subscription;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  accountInvalid: boolean;
  facilityTemplateAdded: boolean;
  facilityTemplateSub: Subscription;
  constructor(private helpPanelService: HelpPanelService, private setupWizardService: SetupWizardService,
    private sharedDataService: SharedDataService, private settingsFormService: SettingsFormsService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    })

    this.accountSub = this.setupWizardService.account.subscribe(val => {
      this.account = val;
      if(this.account){
        this.setAccountInvalid(this.account);
      }
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.facilityTemplateSub = this.setupWizardService.facilityTemplateWorkbook.subscribe(val => {
      this.facilityTemplateAdded = (val != undefined);
    })
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.facilityTemplateSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  setAccountInvalid(account: IdbAccount) {
    let unitsInvalid: boolean = this.settingsFormService.getUnitsForm(account).invalid;
    let reportingInvalid: boolean = this.settingsFormService.getSustainabilityQuestionsForm(account).invalid;
    let generalInformationInvalid: boolean = this.settingsFormService.getGeneralInformationForm(account).invalid;
    this.accountInvalid = (unitsInvalid || reportingInvalid || generalInformationInvalid);

  }
}

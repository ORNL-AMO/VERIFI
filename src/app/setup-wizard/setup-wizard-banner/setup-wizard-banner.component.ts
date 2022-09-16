import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
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
  constructor(private helpPanelService: HelpPanelService, private setupWizardService: SetupWizardService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    })

    this.accountSub = this.setupWizardService.account.subscribe(val => {
      this.account = val;
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy(){
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

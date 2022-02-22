import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
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
  constructor(private helpPanelService: HelpPanelService, private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    })

    this.accountSub = this.setupWizardService.account.subscribe(val => {
      this.account = val;
    });
  }

  ngOnDestroy(){
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

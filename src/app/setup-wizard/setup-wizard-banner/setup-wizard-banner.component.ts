import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';

@Component({
  selector: 'app-setup-wizard-banner',
  templateUrl: './setup-wizard-banner.component.html',
  styleUrls: ['./setup-wizard-banner.component.css']
})
export class SetupWizardBannerComponent implements OnInit {

  constructor(private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

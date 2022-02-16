import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css']
})
export class AccountBannerComponent implements OnInit {

  constructor(private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
  }

  toggleHelpPanel(){
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

import { Component } from '@angular/core';
import { HelpPanelService } from '../help-panel/help-panel.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbAccount } from '../models/idb';

@Component({
  selector: 'app-weather-data',
  templateUrl: './weather-data.component.html',
  styleUrls: ['./weather-data.component.css']
})
export class WeatherDataComponent {

  zipCode: string;
  constructor(private helpPanelService: HelpPanelService, private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.zipCode = selectedAccount.zip;
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

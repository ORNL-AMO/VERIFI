import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-utility-banner',
  templateUrl: './utility-banner.component.html',
  styleUrls: ['./utility-banner.component.css']
})
export class UtilityBannerComponent implements OnInit {

  utilityMeterData: Array<IdbUtilityMeterData>;
  utilityDataSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
    });
  }

  ngOnDestroy(){
    this.utilityDataSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from '../help-panel/help-panel.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeterData } from '../models/idb';
import { MeterGroupingService } from './meter-grouping/meter-grouping.service';

@Component({
  selector: 'app-utility',
  templateUrl: './utility.component.html',
  styleUrls: ['./utility.component.css']
})
export class UtilityComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  utilityMeterData: Array<IdbUtilityMeterData>;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;

  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private meterGroupingService: MeterGroupingService,
    private helpPanelService: HelpPanelService
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.utilityDataSub.unsubscribe();
    this.meterGroupingService.dateRange.next({ minDate: undefined, maxDate: undefined })
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

}

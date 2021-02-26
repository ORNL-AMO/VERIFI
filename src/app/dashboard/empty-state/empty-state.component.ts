import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  utilityMeters: Array<IdbUtilityMeter>;
  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;
  
  constructor(
    public accountdbService: AccountdbService,
    public facilityDbService: FacilitydbService,
    public utilityMeterDbService: UtilityMeterdbService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.utilityDataSub = this.utilityMeterDbService.facilityMeters.subscribe(utilityMeters => {
      this.utilityMeters = utilityMeters;
    });
  }

  addAccount() {
    if(!this.selectedAccount) {
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      this.accountdbService.add(newAccount);
    }
    this.router.navigate(['/account-management']);
  }

  addFacility() {
    if(!this.selectedFacility) {
      let newFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(this.selectedAccount);
      this.facilityDbService.add(newFacility);
    }
    this.router.navigate(['/facility-management']);
  }

  addUtilityData() {
    this.router.navigate(['/utility/energy-consumption']);
  }

  loadTestData() {
    this.accountdbService.addTestData();
    this.facilityDbService.addTestData();
  }
}

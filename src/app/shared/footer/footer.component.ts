import { Component, OnInit } from '@angular/core';
import { version } from '../../../../package.json';
import { AccountService } from "../../account/account/account.service";
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db-service";

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  accountid: number;
  date = new Date();
  version: string = version;
  accountCount: number = 0;
  facilityCount: number = 0;
  facilityCountTotal: number = 0;

  constructor(
    public accountService: AccountService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
  ) { 

  }

  ngOnInit() {
    // Subscribe to account ID
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
      this.countFacilities();
    });

    this.countAccounts();
    this.countAllFacilities();
  }

  countAccounts() {
    // Count all accounts
    this.accountdbService.count().then(
      data => {
        this.accountCount = data;
      },
      error => {
          console.log(error);
      }
    );
  }

  countFacilities() {
    // Count current facilities
    this.facilitydbService.getAllByIndex(this.accountid).then(
      data => {
        this.facilityCount = data.length;
      },
      error => {
          console.log(error);
      }
    );
  }

  countAllFacilities() {
    // Count all facilities
    this.facilitydbService.count().then(
      data => {
        this.facilityCountTotal = data;
      },
      error => {
          console.log(error);
      }
    );
  }

}

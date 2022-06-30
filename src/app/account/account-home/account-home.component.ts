import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  facilitiesSub: Subscription
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.accountFacilities = facilities;
    })
  }

  ngOnDestroy(){
    this.facilitiesSub.unsubscribe();
  }

}

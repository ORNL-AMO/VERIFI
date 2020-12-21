import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  accountFacilitiesSub: Subscription;

  constructor(private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.accountFacilities = val;
    })
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('/facility-summary');
  }
}

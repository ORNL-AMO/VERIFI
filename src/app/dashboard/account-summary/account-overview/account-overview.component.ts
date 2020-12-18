import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountFacilities

  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilityDbService.accountFacilities.subscribe(val => {

    })
  }

}

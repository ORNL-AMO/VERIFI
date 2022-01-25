import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-site-to-source-option',
  templateUrl: './site-to-source-option.component.html',
  styleUrls: ['./site-to-source-option.component.css']
})
export class SiteToSourceOptionComponent implements OnInit {

  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    })
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  save() {
    this.facilityDbService.update(this.selectedFacility);
  }

}

import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-overview-help',
  templateUrl: './facility-overview-help.component.html',
  styleUrls: ['./facility-overview-help.component.css']
})
export class FacilityOverviewHelpComponent {

  selectedFacility: IdbFacility
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy(){
    this.selectedFacilitySub.unsubscribe();
  }
}

import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-predictors-table',
  templateUrl: './facility-predictors-table.component.html',
  styleUrl: './facility-predictors-table.component.css',
  standalone: false
})
export class FacilityPredictorsTableComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription
  constructor(private facilityDbService: FacilitydbService) {

  }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

}

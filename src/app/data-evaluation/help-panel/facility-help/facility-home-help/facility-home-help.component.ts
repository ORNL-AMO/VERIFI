import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-home-help',
    templateUrl: './facility-home-help.component.html',
    styleUrls: ['./facility-home-help.component.css'],
    standalone: false
})
export class FacilityHomeHelpComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }
}

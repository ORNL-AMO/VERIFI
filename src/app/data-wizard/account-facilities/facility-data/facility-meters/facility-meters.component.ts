import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-meters',
  templateUrl: './facility-meters.component.html',
  styleUrl: './facility-meters.component.css'
})
export class FacilityMetersComponent {

  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService){

  }

  ngOnInit(){
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
  }

  ngOnDestroy(){
    this.facilitySub.unsubscribe();
  }
  
  goBack() {

  }

  next() {

  }
}

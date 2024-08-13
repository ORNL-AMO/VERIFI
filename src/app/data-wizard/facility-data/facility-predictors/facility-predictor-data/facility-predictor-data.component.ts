import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-predictor-data',
  templateUrl: './facility-predictor-data.component.html',
  styleUrl: './facility-predictor-data.component.css'
})
export class FacilityPredictorDataComponent {

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

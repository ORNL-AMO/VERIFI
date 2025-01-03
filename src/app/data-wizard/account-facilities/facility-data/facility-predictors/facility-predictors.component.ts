import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-predictors',
  templateUrl: './facility-predictors.component.html',
  styleUrl: './facility-predictors.component.css'
})
export class FacilityPredictorsComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription
  constructor(private facilityDbService: FacilitydbService){

  }

  ngOnInit(){
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy(){
    this.selectedFacilitySub.unsubscribe();
  }


  goBack(){

  }

  next(){

  }
}

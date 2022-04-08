import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-energy-unit-dropdown',
  templateUrl: './energy-unit-dropdown.component.html',
  styleUrls: ['./energy-unit-dropdown.component.css']
})
export class EnergyUnitDropdownComponent implements OnInit {
  @Input()
  groupType: string;
  
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      
    });
  }

  ngOnDestroy(){
    this.selectedFacilitySub.unsubscribe();
  }

}

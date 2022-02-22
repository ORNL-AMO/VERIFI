import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-facilities',
  templateUrl: './setup-facilities.component.html',
  styleUrls: ['./setup-facilities.component.css']
})
export class SetupFacilitiesComponent implements OnInit {

  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription
  constructor(private setupWizardService: SetupWizardService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
      if(this.facilities.length == 0){
        this.addFacility();
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilitiesSub.unsubscribe();
  }

  addFacility() {
    let account: IdbAccount = this.setupWizardService.account.getValue();
    let newFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(account);
    newFacility.wizardId = Math.random().toString(36).substr(2, 9);
    newFacility.name = 'Facility ' + (this.facilities.length + 1);
    this.facilities.push(newFacility);
    this.setupWizardService.facilities.next(this.facilities);
    this.setupWizardService.selectedFacility.next(newFacility);
  }

  selectFacility(facility: IdbFacility) {
    this.setupWizardService.selectedFacility.next(facility);
  }

  deleteFacility() {
    this.facilities = this.facilities.filter(facility => { return facility.wizardId != this.selectedFacility.wizardId });
    this.setupWizardService.selectedFacility.next(this.facilities[0]);
    this.setupWizardService.facilities.next(this.facilities);
  }
}

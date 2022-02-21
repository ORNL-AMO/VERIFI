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

  facilities: Array<IdbFacility>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription
  constructor(private setupWizardService: SetupWizardService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    if (!this.setupWizardService.facilities) {
      this.setupWizardService.facilities = new Array();
      this.addFacility();
    }
    this.facilities = this.setupWizardService.facilities;
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  addFacility() {
    let account: IdbAccount = this.setupWizardService.account.getValue();
    let newFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(account);
    newFacility.wizardId = Math.random().toString(36).substr(2, 9);
    newFacility.name = 'Facility ' + (this.setupWizardService.facilities.length + 1);
    this.setupWizardService.facilities.push(newFacility);
    this.setupWizardService.selectedFacility.next(newFacility);
  }

  selectFacility(facility: IdbFacility) {
    this.setupWizardService.selectedFacility.next(facility);
  }

  deleteFacility() {
    this.setupWizardService.facilities = this.setupWizardService.facilities.filter(facility => { return facility.wizardId != this.selectedFacility.wizardId });
    this.facilities = this.setupWizardService.facilities;
    this.setupWizardService.selectedFacility.next(this.facilities[0]);
  }
}

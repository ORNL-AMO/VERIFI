import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
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
  modalOpen: boolean;
  modalOpenSub: Subscription;
  constructor(private setupWizardService: SetupWizardService, private sharedDataService: SharedDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
      if (this.facilities.length == 0) {
        this.addFacility();
      }
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  addFacility() {
    this.setupWizardService.addFacility();
  }

  selectFacility(facility: IdbFacility) {
    this.setupWizardService.selectedFacility.next(facility);
    this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
  }

  deleteFacility() {
    this.facilities = this.facilities.filter(facility => { return facility.wizardId != this.selectedFacility.wizardId });
    this.setupWizardService.selectedFacility.next(this.facilities[0]);
    this.setupWizardService.facilities.next(this.facilities);
    this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
  }
}

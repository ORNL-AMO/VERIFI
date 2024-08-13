import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SetupWizardService } from '../setup-wizard.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-details',
  templateUrl: './facility-details.component.html',
  styleUrl: './facility-details.component.css'
})
export class FacilityDetailsComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private setupWizardService: SetupWizardService,
    private router: Router
  ) { }


  ngOnInit() {
    this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let facilityGuid: string = params['id'];
      let facilities: Array<IdbFacility> = this.setupWizardService.facilities.getValue();
      let selectedFacility: IdbFacility = facilities.find(facility => {
        return facility.guid == facilityGuid
      });
      if (selectedFacility) {
        this.setupWizardService.selectedFacility.next(selectedFacility);
      } else {
        this.router.navigateByUrl('/setup-wizard')
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  goBack() {

  }

  next() {

  }
}

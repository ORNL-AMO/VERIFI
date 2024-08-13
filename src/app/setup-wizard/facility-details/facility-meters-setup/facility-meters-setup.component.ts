import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { SetupWizardService } from '../../setup-wizard.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-meters-setup',
  templateUrl: './facility-meters-setup.component.html',
  styleUrl: './facility-meters-setup.component.css'
})
export class FacilityMetersSetupComponent {


  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  constructor(private setupWizardService: SetupWizardService) {

  }

  ngOnInit() {
    this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

}

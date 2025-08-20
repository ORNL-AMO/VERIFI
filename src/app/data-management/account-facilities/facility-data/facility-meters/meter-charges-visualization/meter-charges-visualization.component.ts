import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';

@Component({
  selector: 'app-meter-charges-visualization',
  standalone: false,
  templateUrl: './meter-charges-visualization.component.html',
  styleUrl: './meter-charges-visualization.component.css'
})
export class MeterChargesVisualizationComponent {
  
  facility: IdbFacility;
  facilitySub: Subscription;
  utilityMeter: IdbUtilityMeter;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      if (this.utilityMeter) {
        this.utilityMeterDbService.selectedMeter.next(this.utilityMeter);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.utilityMeterDbService.selectedMeter.next(undefined);
  }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }

}

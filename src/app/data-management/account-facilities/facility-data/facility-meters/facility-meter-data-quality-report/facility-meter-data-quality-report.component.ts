import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-facility-meter-data-quality-report',
  standalone: false,
  templateUrl: './facility-meter-data-quality-report.component.html',
  styleUrl: './facility-meter-data-quality-report.component.css'
})
export class FacilityMeterDataQualityReportComponent {

  utilityMeter: IdbUtilityMeter;
  utilityMeterData: Array<IdbUtilityMeterData>;
  
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      if (this.utilityMeter) {
        this.utilityMeterDbService.selectedMeter.next(this.utilityMeter);
        this.utilityMeterData = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.utilityMeter.guid);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.utilityMeterDbService.selectedMeter.next(undefined);
  }
 

  goToMeterList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
    selector: 'app-energy-consumption',
    templateUrl: './energy-consumption.component.html',
    styleUrls: ['./energy-consumption.component.css'],
    standalone: false
})
export class EnergyConsumptionComponent implements OnInit {

  utilityMeters: Array<IdbUtilityMeter>;

  facilityMetersSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.utilityMeters = facilityMeters;
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }
}

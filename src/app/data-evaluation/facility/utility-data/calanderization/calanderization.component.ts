import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-calanderization',
  templateUrl: './calanderization.component.html',
  styleUrls: ['./calanderization.component.css'],
  standalone: false
})
export class CalanderizationComponent implements OnInit {

  facilityMetersSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;

  selectedMeter: IdbUtilityMeter;
  constructor(private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.initializeSelectedMeter();
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    // this.facilityMeterDataSub.unsubscribe();
    // this.calanderizedDataFiltersSub.unsubscribe();
    // this.itemsPerPageSub.unsubscribe();
    // this.calanderizationService.calanderizedDataFilters.next({
    //   selectedSources: [],
    //   showAllSources: true,
    //   selectedDateMax: undefined,
    //   selectedDateMin: undefined,
    //   dataDateRange: undefined
    // });
    // this.calanderizationService.displayGraphCost = this.displayGraphCost;
    // this.calanderizationService.displayGraphEnergy = this.displayGraphEnergy;
    // this.calanderizationService.dataDisplay = this.dataDisplay;
  }

  initializeSelectedMeter() {
    if (!this.selectedMeter) {
      this.selectMeter(this.facilityMeters[0])
    } else {
      let meterInFacility: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == this.selectedMeter.id });
      if (!meterInFacility) {
        this.selectMeter(this.facilityMeters[0])
      }
    }
  }

  selectMeter(meter: IdbUtilityMeter) {
    this.selectedMeter = meter;
  }
}

import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-meter-data',
  templateUrl: './meter-data.component.html',
  styleUrl: './meter-data.component.css'
})
export class MeterDataComponent {

  selectedMeter: IdbUtilityMeter;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      this.selectedMeter = facilityMeters.find(meter => { return meter.guid == meterId });
      this.utilityMeterDbService.selectedMeter.next(this.selectedMeter);
    });
  }

  ngOnDestroy() {
    this.utilityMeterDbService.selectedMeter.next(undefined);
  }
}

import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-facility-meter-monthly-data',
  templateUrl: './facility-meter-monthly-data.component.html',
  styleUrl: './facility-meter-monthly-data.component.css',
  standalone: false
})
export class FacilityMeterMonthlyDataComponent {

  utilityMeter: IdbUtilityMeter;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      this.utilityMeterDbService.selectedMeter.next(this.utilityMeter);
    });
  }
}

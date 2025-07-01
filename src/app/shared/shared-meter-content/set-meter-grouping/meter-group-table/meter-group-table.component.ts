import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-meter-group-table',
  standalone: false,

  templateUrl: './meter-group-table.component.html',
  styleUrl: './meter-group-table.component.css'
})
export class MeterGroupTableComponent {
  @Input()
  groupId: string;

  meters: Array<IdbUtilityMeter>;
  metersSub: Subscription;
  constructor(private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit() {
    this.metersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.meters = meters.filter(m => {
        return m.groupId == this.groupId;
      });
    });
  }

  ngOnDestroy() {
    this.metersSub.unsubscribe();
  }
}

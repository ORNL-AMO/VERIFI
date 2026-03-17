import { Component, input, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-meter-group-table',
  standalone: false,

  templateUrl: './meter-group-table.component.html',
  styleUrl: './meter-group-table.component.css'
})
export class MeterGroupTableComponent {
  @Input({required: true})
  meterGroup: IdbUtilityMeterGroup;
  @Input()
  showHeader: boolean;

  meters: Array<IdbUtilityMeter>;
  metersSub: Subscription;
  constructor(private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit() {
    this.metersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.meters = meters.filter(m => {
        if (this.meterGroup == undefined) {
          return m.groupId == undefined;
        } else {
          return m.groupId == this.meterGroup.guid;
        }
      });
    });
  }

  ngOnDestroy() {
    this.metersSub.unsubscribe();
  }
}

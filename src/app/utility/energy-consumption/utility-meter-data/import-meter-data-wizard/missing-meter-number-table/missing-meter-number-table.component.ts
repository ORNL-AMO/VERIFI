import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-missing-meter-number-table',
  templateUrl: './missing-meter-number-table.component.html',
  styleUrls: ['./missing-meter-number-table.component.css']
})
export class MissingMeterNumberTableComponent implements OnInit {
  @Input()
  missingMeterNumberBounds: Array<{ start: number, end: number, selectedMeter: IdbUtilityMeter }>
  @Input()
  importMeterDataFileType: string;
  @Output()
  submit: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input()
  showMeterDropdown: boolean;

  facilityMeters: Array<IdbUtilityMeter>;
  constructor(private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    if (this.showMeterDropdown) {
      let allFacilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      if (this.importMeterDataFileType == 'Electricity') {
        this.facilityMeters = allFacilityMeters.filter(meter => { return meter.source == 'Electricity' })
      } else {
        this.facilityMeters = allFacilityMeters.filter(meter => { return meter.source != 'Electricity' })
      }
    }
  }

  submitChanges() {
    this.submit.emit(true);
  }
}

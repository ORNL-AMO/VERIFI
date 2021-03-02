import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ImportMeterFileSummary } from '../../import-meter.service';
import { UploadDataService } from '../../upload-data.service';

@Component({
  selector: 'app-missing-meter-number-table',
  templateUrl: './missing-meter-number-table.component.html',
  styleUrls: ['./missing-meter-number-table.component.css']
})
export class MissingMeterNumberTableComponent implements OnInit {
  @Input()
  invalidMissingMeter: Array<IdbUtilityMeterData>
  @Input()
  isTemplateElectricity: boolean;

  facilityMeters: Array<IdbUtilityMeter>;

  meterDataArrays: Array<Array<IdbUtilityMeterData>>;

  constructor(private utilityMeterDbService: UtilityMeterdbService, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let importMeterDataFiles: Array<{ fileName: string; importMeterFileSummary: ImportMeterFileSummary; id: string; }> = this.uploadDataService.importMeterFiles.getValue();
    this.facilityMeters = new Array();
    facilityMeters.forEach(meter => {
      if (meter.source == 'Electricity' && this.isTemplateElectricity) {
        this.facilityMeters.push(meter);
      } else if (meter.source != 'Electricity' && !this.isTemplateElectricity) {
        this.facilityMeters.push(meter);
      }
    });

    let validNewMeters: Array<IdbUtilityMeter> = importMeterDataFiles.flatMap(meterFile => { return meterFile.importMeterFileSummary.newMeters });
    validNewMeters.forEach(meter => {
      if (meter.source == 'Electricity' && this.isTemplateElectricity) {
        this.facilityMeters.push(meter);
      } else if (meter.source != 'Electricity' && !this.isTemplateElectricity) {
        this.facilityMeters.push(meter);
      }
    });
  }

  setMeterNumber(index: number) {
    for (let i = index; i < this.invalidMissingMeter.length; i++) {
      //TODO: Verifiy meterNumber/data combo doesn't repeat?
      this.invalidMissingMeter[i].meterNumber = this.invalidMissingMeter[index].meterNumber;
    }
  }
}

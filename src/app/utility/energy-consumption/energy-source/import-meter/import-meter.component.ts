import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-import-meter',
  templateUrl: './import-meter.component.html',
  styleUrls: ['./import-meter.component.css']
})
export class ImportMeterComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  @ViewChild('inputFile') myInputVariable: ElementRef;

  importError: string = '';
  quickViewMeters: Array<IdbUtilityMeter>;
  importMeters: Array<IdbUtilityMeter>;
  constructor(private utilityMeterGroupdbService: UtilityMeterGroupdbService, private utilityMeterdbService: UtilityMeterdbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
  }

  meterImport(files: FileList) {
    // Clear with each upload
    this.quickViewMeters = new Array();
    this.importMeters = new Array();
    this.importError = '';

    if (files && files.length > 0) {
      let file: File = files.item(0);
      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].replace('\r', '').split(",");
        const allowedHeaders = ["meterNumber", "accountNumber", "type", "name", "location", "supplier", "group", "notes"];

        if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {
          let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
          for (var i = 1; i < lines.length; i++) {
            const obj: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId);
            const currentline = lines[i].split(",");
            for (var j = 0; j < headers.length; j++) {
              obj[headers[j]] = currentline[j];
            }

            // Read csv and push to obj array.
            this.importMeters.push(obj);

            // Push the first 3 results to a quick view array
            if (i < 4) {
              this.quickViewMeters.push(obj);
            }

          }
        } else {
          // csv didn't match -> Show error
          this.importError = "Error with file. Please match your file to the provided template.";
          return false;
        }
      }
    }
  }

  runImport() {
    this.checkImportMeterGroups();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.utilityMeterGroupdbService.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityGroups => {
      this.importMeters.forEach(meter => {
        let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
        if (existingGroup) {
          meter.groupId = existingGroup.id;
        }
        this.utilityMeterdbService.add(meter);
      });
      this.resetImport();
    });
  }

  async checkImportMeterGroups() {
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
    let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();

    this.importMeters.forEach(meter => {
      let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
      let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
      if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
        let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup("Energy", '', meter.group, meter.facilityId, meter.accountId);
        uniqNeededGroups.push(utilityMeterGroup);
      }
    });
    await uniqNeededGroups.forEach(neededGroup => {
      this.utilityMeterGroupdbService.addFromImport(neededGroup);
    });
    this.utilityMeterGroupdbService.setFacilityMeterGroups();
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
    this.quickViewMeters = undefined;
    this.importMeters = undefined;
    this.importError = '';
    this.emitClose.emit(true);
  }
}

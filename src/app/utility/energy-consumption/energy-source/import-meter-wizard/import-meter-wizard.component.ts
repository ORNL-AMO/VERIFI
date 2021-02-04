import { invalid } from '@angular/compiler/src/render3/view/util';
import { Component, OnInit, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';

@Component({
  selector: 'app-import-meter-wizard',
  templateUrl: './import-meter-wizard.component.html',
  styleUrls: ['./import-meter-wizard.component.css']
})
export class ImportMeterWizardComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  @ViewChild('inputFile') myInputVariable: ElementRef;

  importError: string = '';
  // quickViewMeters: Array<IdbUtilityMeter>;
  importMeters: Array<IdbUtilityMeter>;
  selectedMeterForm: FormGroup;
  selectedMeterIndex: number;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;
  skipMeters: Array<boolean>;
  constructor(private utilityMeterGroupdbService: UtilityMeterGroupdbService, private utilityMeterdbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private editMeterFormService: EditMeterFormService, private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterdbService.facilityMeters.subscribe(val => {
      this.facilityMeters = val;
    })
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }

  meterImport(files: FileList) {
    // Clear with each upload
    // this.quickViewMeters = new Array();
    this.importMeters = new Array();
    this.importError = '';
    this.skipMeters = new Array();
    if (files && files.length > 0) {
      let file: File = files.item(0);
      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        let csv: string = reader.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].replace('\r', '').split(",");
        const allowedHeaders = ["Meter Number", "Account Number", "Source", "Meter Name", "Utility Supplier", "Notes", "Building / Location", "Meter Group"];

        if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {
          let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
          for (var i = 1; i < lines.length - 1; i++) {
            const obj: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId);
            const currentLine = lines[i].split(",");
            // for (var j = 0; j < headers.length; j++) {
            obj.meterNumber = currentLine[0];
            obj.accountNumber = Number(currentLine[1]);
            obj.source = currentLine[2];
            obj.name = currentLine[3];
            obj.supplier = currentLine[4];
            obj.notes = currentLine[5];
            obj.location = currentLine[6];
            obj.group = currentLine[7];
            // Read csv and push to obj array.
            this.importMeters.push(obj);
            this.skipMeters.push(false);
            if (i == 1) {
              this.selectMeter(obj, 0);
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
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Adding Meters...");
    this.checkImportMeterGroups();
    this.setGroupIds();
    this.addMeters();
    this.utilityMeterdbService.setAccountMeters();
    this.utilityMeterdbService.setFacilityMeters();
    this.loadingService.setLoadingStatus(false);
    this.resetImport();
  }

  async checkImportMeterGroups() {
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
    let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();

    this.importMeters.forEach(meter => {
      let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
      let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
      if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
        //TODO: Alternate meter group type (Energy/Water/Other)
        let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup("Energy", '', meter.group, meter.facilityId, meter.accountId);
        uniqNeededGroups.push(utilityMeterGroup);
      }
    });
    await uniqNeededGroups.forEach(neededGroup => {
      this.utilityMeterGroupdbService.addFromImport(neededGroup);
    });
    this.utilityMeterGroupdbService.setFacilityMeterGroups();
  }

  setGroupIds() {
    let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue()
    this.importMeters.forEach(meter => {
      let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
      if (existingGroup) {
        meter.groupId = existingGroup.id;
      }
    });
  }

  async addMeters() {
    await this.importMeters.forEach((importMeter: IdbUtilityMeter, index: number) => {
      if (this.skipMeters[index] == false) {
        //check if meter already exists
        let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
        if (facilityMeter) {
          //update existing meter with form from import meter
          let form: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
          facilityMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, form);
          //update
          this.utilityMeterdbService.updateWithObservable(facilityMeter);
        } else {
          //add
          this.utilityMeterdbService.addWithObservable(importMeter);
        }
      }
    });
  }


  resetImport() {
    this.myInputVariable.nativeElement.value = '';
    // this.quickViewMeters = undefined;
    this.importMeters = undefined;
    this.importError = '';
    this.emitClose.emit(true);
  }

  selectMeter(meter: IdbUtilityMeter, meterIndex: number) {
    this.selectedMeterIndex = meterIndex;
    this.selectedMeterForm = this.editMeterFormService.getFormFromMeter(meter);
    this.selectedMeterForm.statusChanges.subscribe(val => {
      this.updateSelectedMeter();
    });
  }

  isMeterInvalid(meter: IdbUtilityMeter): boolean {
    return this.editMeterFormService.getFormFromMeter(meter).invalid;
  }

  hasInvalidMeter(): boolean {
    if (this.importMeters) {
      let invalidMeter: IdbUtilityMeter = this.importMeters.find((meter: IdbUtilityMeter, index: number) => {
        if (this.skipMeters[index] == false) {
          return this.isMeterInvalid(meter);
        }
      });
      if (invalidMeter) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  updateSelectedMeter() {
    this.importMeters[this.selectedMeterIndex] = this.editMeterFormService.updateMeterFromForm(this.importMeters[this.selectedMeterIndex], this.selectedMeterForm)
  }

  getBadgeClass(meter: IdbUtilityMeter, index: number): string {
    if (this.skipMeters[index] == true) {
      return 'badge-secondary';
    } else {
      let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == meter.name });
      if (facilityMeter) {
        return 'badge-warning';
      } else {
        let isMeterInvalid: boolean = this.isMeterInvalid(meter);
        if (isMeterInvalid) {
          return 'badge-danger';
        } else {
          return 'badge-success';
        }
      }
    }
  }

  toggleSkipMeter(index: number) {
    this.skipMeters[index] = !this.skipMeters[index];
  }
}

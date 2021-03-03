import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { EditMeterFormService } from '../../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { ImportMeterFileSummary } from '../import-meter.service';
import { UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-import-meter-wizard',
  templateUrl: './import-meter-wizard.component.html',
  styleUrls: ['./import-meter-wizard.component.css']
})
export class ImportMeterWizardComponent implements OnInit {
  @Input()
  wizardContext: "excel" | "template";
  @Input()
  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string };

  importError: boolean;
  importMeters: Array<IdbUtilityMeter>;
  selectedMeterForm: FormGroup;
  selectedMeterIndex: number;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;
  skipMeters: Array<boolean>;
  constructor(private utilityMeterdbService: UtilityMeterdbService, private editMeterFormService: EditMeterFormService, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.facilityMeters = this.utilityMeterdbService.facilityMeters.getValue();
    if (this.wizardContext == 'template') {
      this.importMeterFileWizard = this.uploadDataService.importMeterFileWizard.getValue();
    }
    this.importMeters = new Array();
    this.skipMeters = new Array();

    this.importMeterFileWizard.importMeterFileSummary.newMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.importMeterFileWizard.importMeterFileSummary.existingMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.importMeterFileWizard.importMeterFileSummary.skippedMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(true);
    });
    this.importMeterFileWizard.importMeterFileSummary.invalidMeters.forEach(meter => {
      this.importMeters.push(meter);
      this.skipMeters.push(false);
    })
    this.selectMeter(this.importMeters[0], 0);
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
      let isMeterInvalid: boolean = this.isMeterInvalid(meter);
      if (isMeterInvalid) {
        return 'badge-danger';
      } else {
        let facilityMeter: IdbUtilityMeter = this.facilityMeters.find(facilityMeter => { return facilityMeter.name == meter.name });
        if (facilityMeter) {
          return 'badge-warning';
        } else {
          return 'badge-success';
        }
      }
    }
  }

  toggleSkipMeter(index: number) {
    this.skipMeters[index] = !this.skipMeters[index];
  }


  cancel() {
    this.uploadDataService.importMeterFileWizard.next(undefined);
  }

  submit() {
    this.importMeterFileWizard.importMeterFileSummary.existingMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.newMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.invalidMeters = new Array();
    this.importMeterFileWizard.importMeterFileSummary.skippedMeters = new Array();
    this.importMeters.forEach((meter, index) => {
      let badgeClass: string = this.getBadgeClass(meter, index);
      if (badgeClass == 'badge-secondary') {
        this.importMeterFileWizard.importMeterFileSummary.skippedMeters.push(meter);
      } else if (badgeClass == 'badge-danger') {
        this.importMeterFileWizard.importMeterFileSummary.invalidMeters.push(meter);
      } else if (badgeClass == 'badge-warning') {
        this.importMeterFileWizard.importMeterFileSummary.existingMeters.push(meter);
      } else if (badgeClass == 'badge-success') {
        this.importMeterFileWizard.importMeterFileSummary.newMeters.push(meter);
      }
    });

    if (this.wizardContext == "template") {
      let importMeterFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }> = this.uploadDataService.importMeterFiles.getValue();
      let wizardFileIndex: number = importMeterFiles.findIndex(file => { return file.id == this.importMeterFileWizard.id });
      importMeterFiles[wizardFileIndex] = this.importMeterFileWizard;
      this.uploadDataService.importMeterFiles.next(importMeterFiles);
    } else {
      //add
    }
    this.uploadDataService.updateMeterDataFromTemplates();
    this.cancel();
  }


}

import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { EditMeterFormService } from 'src/app/utility/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';

@Component({
  selector: 'app-meter-wizard',
  templateUrl: './meter-wizard.component.html',
  styleUrls: ['./meter-wizard.component.css']
})
export class MeterWizardComponent implements OnInit {
  @Input()
  importMeters: Array<IdbUtilityMeter>;
  @Input()
  importMeterConsumption: Array<Array<number>>;
  @Input()
  importMeterDates: Array<Date>;


  skipMeters: Array<boolean>;
  selectedMeterForm: FormGroup;
  selectedMeterIndex: number;
  facilityMeters: Array<IdbUtilityMeter>;
  constructor(private editMeterFormService: EditMeterFormService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    this.skipMeters = this.importMeters.map(() => { return false });
    this.selectMeter(this.importMeters[0], 0);
  }


  selectMeter(meter: IdbUtilityMeter, meterIndex: number) {
    this.selectedMeterIndex = meterIndex;
    this.selectedMeterForm = this.editMeterFormService.getFormFromMeter(meter);
    this.selectedMeterForm.statusChanges.subscribe(val => {
      this.updateSelectedMeter();
    });
  }

  updateSelectedMeter() {
    this.importMeters[this.selectedMeterIndex] = this.editMeterFormService.updateMeterFromForm(this.importMeters[this.selectedMeterIndex], this.selectedMeterForm)
  }

  toggleSkipMeter(index: number) {
    this.skipMeters[index] = !this.skipMeters[index];
  }

  isMeterInvalid(meter: IdbUtilityMeter): boolean {
    return this.editMeterFormService.getFormFromMeter(meter).invalid;
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

}

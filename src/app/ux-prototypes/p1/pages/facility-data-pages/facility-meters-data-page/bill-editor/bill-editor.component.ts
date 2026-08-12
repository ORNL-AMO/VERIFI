import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';
import { P1BillEditorMode } from '../facility-meters-workbench.helpers';

@Component({
  selector: 'app-p1-facility-meter-bill-editor',
  templateUrl: './bill-editor.component.html',
  styleUrls: ['./bill-editor.component.css'],
  standalone: false
})
export class P1FacilityMeterBillEditorComponent implements OnChanges {
  private readonly meterDataService = inject(UtilityMeterDataService);

  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input() meterData?: IdbUtilityMeterData;
  @Input({ required: true }) allMeterData: IdbUtilityMeterData[] = [];
  @Input({ required: true }) mode: P1BillEditorMode = 'add';
  @Input() canWrite = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() saveBill = new EventEmitter<{ data: IdbUtilityMeterData; addAnother: boolean }>();

  form: FormGroup;
  draft: IdbUtilityMeterData;
  displayVolume = false;
  displayEnergy = false;
  displayHeatCapacity = false;
  displayVehicleFuelEfficiency = false;

  ngOnChanges(): void {
    if (!this.meter) {
      return;
    }
    this.draft = structuredClone(this.meterData || getNewIdbUtilityMeterData(this.meter, this.allMeterData));
    this.setForm();
  }

  get chargesArray(): FormArray {
    return this.form.get('chargesArray') as FormArray;
  }

  submit(addAnother = false): void {
    if (!this.form.valid || !this.canWrite) {
      this.form.markAllAsTouched();
      return;
    }
    const updated = this.meter.source === 'Electricity'
      ? this.meterDataService.updateElectricityMeterDataFromForm(structuredClone(this.draft), this.form)
      : this.meterDataService.updateGeneralMeterDataFromForm(structuredClone(this.draft), this.form);
    this.saveBill.emit({ data: updated, addAnother });
  }

  private setForm(): void {
    if (this.meter.source === 'Electricity') {
      this.form = this.meterDataService.getElectricityMeterDataForm(this.draft);
      return;
    }
    this.displayVolume = !getIsEnergyUnit(this.meter.startingUnit);
    this.displayEnergy = getIsEnergyMeter(this.meter.source) || getIsEnergyUnit(this.meter.startingUnit);
    this.displayHeatCapacity = checkShowHeatCapacity(this.meter.source, this.meter.startingUnit, this.meter.scope);
    this.displayVehicleFuelEfficiency = this.meter.scope === 2 && this.meter.vehicleCategory === 2;
    this.form = this.meterDataService.getGeneralMeterDataForm(
      this.draft,
      this.displayVolume,
      this.displayEnergy,
      this.displayHeatCapacity,
      this.displayVehicleFuelEfficiency,
      this.meter.source
    );
    if (this.displayVolume) {
      this.form.controls.totalEnergyUse.disable();
    }
  }
}

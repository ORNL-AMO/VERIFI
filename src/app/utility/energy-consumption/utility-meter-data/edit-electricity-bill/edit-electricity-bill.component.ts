import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db-service';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyConsumptionService } from '../../energy-consumption.service';
import { ElectricityDataFilter, UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-edit-electricity-bill',
  templateUrl: './edit-electricity-bill.component.html',
  styleUrls: ['./edit-electricity-bill.component.css']
})
export class EditElectricityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();


  meterDataForm: FormGroup;
  electricityDataFilters: Array<ElectricityDataFilter>;
  electricityDataFiltersSub: Subscription;
  constructor(private energyConsumptionService: EnergyConsumptionService, private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {
    this.meterDataForm = this.energyConsumptionService.getElectricityMeterDataForm(this.editMeterData);
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityDataFilters.subscribe(dataFilters => {
      this.electricityDataFilters = dataFilters;
    });
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  meterDataSave() {
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(this.meterDataForm.value);
    } else {
      let meterData: IdbUtilityMeterData = this.meterDataForm.value;
      delete meterData.id;
      this.utilityMeterDataDbService.add(this.meterDataForm.value);
    }
    this.cancel();
  }

}

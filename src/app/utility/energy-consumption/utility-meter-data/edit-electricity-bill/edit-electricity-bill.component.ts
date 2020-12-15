import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilter } from 'src/app/models/electricityFilter';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';

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
  energyUnit: string;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    let facilityMeter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    this.energyUnit = facilityMeter.startingUnit
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
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
      this.utilityMeterDataDbService.add(meterData);
    }
    this.cancel();
  }

  showAllFields() {
    this.electricityDataFilters.forEach(field => {
      field.filter = true;
    });
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    selectedFacility.electricityInputFilters = this.electricityDataFilters;
    this.facilityDbService.update(selectedFacility);
  }

}

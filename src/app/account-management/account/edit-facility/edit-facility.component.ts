import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, MassUnitOptions, SizeUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AccountManagementService } from '../../account-management.service';

@Component({
  selector: 'app-edit-facility',
  templateUrl: './edit-facility.component.html',
  styleUrls: ['./edit-facility.component.css']
})

export class EditFacilityComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  facilityForm: FormGroup;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  volumeGasOptions: Array<UnitOption> = VolumeGasOptions;
  volumeLiquidOptions: Array<UnitOption> = VolumeLiquidOptions;
  sizeUnitOptions: Array<UnitOption> = SizeUnitOptions;
  massUnitOptions: Array<UnitOption> = MassUnitOptions;

  constructor(private facilityDbService: FacilitydbService, private accountManagementService: AccountManagementService) { }

  ngOnInit(): void {
    this.facilityForm = this.accountManagementService.getFacilityForm(this.facility);
  }

  save() {
    this.facilityForm = this.accountManagementService.checkCustom(this.facilityForm);
    this.facility = this.accountManagementService.updateFacilityFromForm(this.facilityForm, this.facility);
    this.facilityDbService.update(this.facility);
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  setUnitsOfMeasure() {
    this.facilityForm = this.accountManagementService.setUnitsOfMeasure(this.facilityForm);
  }

  checkCustom() {
    this.facilityForm = this.accountManagementService.checkCustom(this.facilityForm);
  }
}

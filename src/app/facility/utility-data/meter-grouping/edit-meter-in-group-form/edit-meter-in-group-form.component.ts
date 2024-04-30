import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';

@Component({
  selector: 'app-edit-meter-in-group-form',
  templateUrl: './edit-meter-in-group-form.component.html',
  styleUrl: './edit-meter-in-group-form.component.css'
})
export class EditMeterInGroupFormComponent {
  @Input()
  meterToEdit: IdbUtilityMeter;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input()
  allMeterGroupTypes: Array<MeterGroupType>;
  @Output('emitSave')
  emitSave: EventEmitter<boolean> = new EventEmitter<boolean>();

  meterGroupTypes: Array<MeterGroupType>
  constructor() {

  }

  ngOnInit() {
    this.meterGroupTypes = new Array();
    this.allMeterGroupTypes.forEach(meterGroupType => {
      if(meterGroupType.groupType == 'Other'){
        this.meterGroupTypes.push(meterGroupType);
      }else if(meterGroupType.groupType == 'Energy' && getIsEnergyMeter(this.meterToEdit.source)){
        this.meterGroupTypes.push(meterGroupType);
      }else if(meterGroupType.groupType == 'Water' && (this.meterToEdit.source == 'Water Intake' || this.meterToEdit.source == 'Water Discharge')){
        this.meterGroupTypes.push(meterGroupType);
      }
    })
  }

  save() {
    this.emitSave.emit(true);
  }

  cancel() {
    this.emitClose.emit(true);
  }
}

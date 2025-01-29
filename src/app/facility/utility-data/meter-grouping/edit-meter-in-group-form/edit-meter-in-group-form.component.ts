import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';

@Component({
    selector: 'app-edit-meter-in-group-form',
    templateUrl: './edit-meter-in-group-form.component.html',
    styleUrl: './edit-meter-in-group-form.component.css',
    standalone: false
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

  meterGroupTypes: Array<MeterGroupType>;
  originalGroupId: string;
  constructor() {

  }

  ngOnInit() {
    this.originalGroupId = this.meterToEdit.groupId;
    this.meterGroupTypes = new Array();
    this.allMeterGroupTypes.forEach(meterGroupType => {
      if (meterGroupType.groupType == 'Other') {
        this.meterGroupTypes.push(meterGroupType);
      } else if (meterGroupType.groupType == 'Energy' && getIsEnergyMeter(this.meterToEdit.source)) {
        this.meterGroupTypes.push(meterGroupType);
      } else if (meterGroupType.groupType == 'Water' && (this.meterToEdit.source == 'Water Intake' || this.meterToEdit.source == 'Water Discharge')) {
        this.meterGroupTypes.push(meterGroupType);
      }
    })
  }

  save() {
    this.emitSave.emit(true);
  }

  cancel() {
    this.meterToEdit.groupId = this.originalGroupId;
    this.emitClose.emit(true);
  }
}

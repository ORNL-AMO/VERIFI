import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import * as _ from 'lodash';

@Component({
  selector: 'app-meter-group-form',
  standalone: false,

  templateUrl: './meter-group-form.component.html',
  styleUrl: './meter-group-form.component.css'
})
export class MeterGroupFormComponent {
  @Input()
  meterGroup: IdbUtilityMeterGroup;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input()
  hasEnergyMeters: boolean;
  @Input()
  hasWaterMeters: boolean;

  groupForm: FormGroup;
  meterGroupOptions: Array<MeterGroupOption>;
  selectionsChanged: boolean = false;
  hasExistingGroups: boolean = false;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private formBuilder: FormBuilder,
    private utilityMeterDbService: UtilityMeterdbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (!this.meterGroup) {
      if (this.hasEnergyMeters) {
        this.meterGroup = getNewIdbUtilityMeterGroup("Energy", "New Meter Group", facility.guid, facility.accountId);
      } else if (this.hasWaterMeters) {
        this.meterGroup = getNewIdbUtilityMeterGroup("Water", "New Meter Group", facility.guid, facility.accountId);
      } else {
        this.meterGroup = getNewIdbUtilityMeterGroup("Other", "New Meter Group", facility.guid, facility.accountId);
      }
    }
    this.groupForm = this.formBuilder.group({
      name: [this.meterGroup.name, Validators.required],
      groupType: [this.meterGroup.groupType, Validators.required],
      description: [this.meterGroup.description]
    });
    if (!this.meterGroup.id) {
      this.groupForm.markAsDirty();
    } else {
      this.groupForm.controls['groupType'].disable();
    }
    this.setGroupOptions();
    this.hasExistingGroups = this.meterGroupOptions.find(option => { return option.inAnotherGroup }) != undefined;
  }

  cancel() {
    this.emitClose.emit(true);
  }

  async saveChanges() {
    this.meterGroup.name = this.groupForm.controls['name'].value;
    this.meterGroup.groupType = this.groupForm.controls['groupType'].value;
    this.meterGroup.description = this.groupForm.controls['description'].value;
    if (!this.meterGroup.id) {
      await firstValueFrom(this.utilityMeterGroupDbService.addWithObservable(this.meterGroup));
    } else {
      await firstValueFrom(this.utilityMeterGroupDbService.updateWithObservable(this.meterGroup));
    }
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    for (let i = 0; i < this.meterGroupOptions.length; i++) {
      let groupOption: MeterGroupOption = this.meterGroupOptions[i];
      let meter: IdbUtilityMeter = meters.find(m => { return m.guid == groupOption.guid });
      if (groupOption.includeInGroup) {
        //add to group
        meter.groupId = this.meterGroup.guid;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
      } else if (meter.groupId == this.meterGroup.guid) {
        //remove from group
        meter.groupId = undefined;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeterGroups(account, facility);
    await this.dbChangesService.setMeters(account, facility);
    this.cancel()
  }

  setGroupOptions() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    if (this.groupForm.controls['groupType'].value == 'Energy') {
      let energyMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
        return getIsEnergyMeter(meter.source)
      });
      this.meterGroupOptions = energyMeters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    } else if (this.groupForm.controls['groupType'].value == 'Water') {
      let waterMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
        return meter.source == 'Water Discharge' || meter.source == 'Water Intake';
      });
      this.meterGroupOptions = waterMeters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    } else if (this.groupForm.controls['groupType'].value == 'Other') {
      this.meterGroupOptions = meters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    }

    this.meterGroupOptions = _.orderBy(this.meterGroupOptions, (option: MeterGroupOption) => {
      return option.inAnotherGroup
    }, 'asc')
  }

  setSelectionsChanged() {
    this.selectionsChanged = true;
  }
}

export interface MeterGroupOption {
  includeInGroup: boolean,
  inAnotherGroup: boolean,
  name: string,
  source: MeterSource,
  scope: number,
  guid: string
}
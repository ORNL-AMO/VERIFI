import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EquipmentTypes } from '../../calculations/equipmentTypes';
import { EquipmentType, EquipmentUtilityData } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from '../facility-energy-use-equipment-form.service';

@Component({
  selector: 'app-equipment-details-form',
  standalone: false,
  templateUrl: './equipment-details-form.component.html',
  styleUrl: './equipment-details-form.component.css',
})
export class EquipmentDetailsFormComponent {
  @Input({ required: true })
  equipmentDetailsForm: FormGroup;
  @Input({ required: true })
  utilityDataForms: Array<UtilityDataForm>;
  @Input({ required: true })
  annualOperatingConditionsDataForms: Array<FormGroup>;

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;
  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMetersSub: Subscription;

  showLinkMeterModal: boolean = false;

  linkedMeterGroup: IdbUtilityMeterGroup;
  linkedMeterGroupId: string;

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utiltiyMeterDbService: UtilityMeterdbService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.linkedMeterGroupId = this.equipmentDetailsForm.controls['utilityMeterGroupId'].value;
    this.utilityMetersSub = this.utiltiyMeterDbService.facilityMeters.subscribe(meters => {
      this.utilityMeters = meters;
    });
    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(groups => {
      this.utilityMeterGroups = groups.filter(group => { return group.groupType == 'Energy' });
      this.setLinkedMeterGroup();
    });
  }

  ngOnDestroy() {
    this.utilityMeterGroupsSub.unsubscribe();
    this.utilityMetersSub.unsubscribe();
  }

  openLinkMeterTable() {
    this.showLinkMeterModal = true;
  }

  changeLinkedMeterGroup(meterGroup: IdbUtilityMeterGroup) {
    if (meterGroup.guid != this.linkedMeterGroupId) {
      this.linkedMeterGroupId = meterGroup.guid;
    } else {
      this.linkedMeterGroupId = '';
    }
    this.equipmentDetailsForm.markAsDirty()
  }

  cancelLinkMeterGroup() {
    this.linkedMeterGroupId = this.equipmentDetailsForm.controls['utilityMeterGroupId'].value;
    this.showLinkMeterModal = false;
    this.equipmentDetailsForm.markAsDirty()
  }

  closeLinkMeterGroup() {
    this.showLinkMeterModal = false;
    this.setLinkedMeterGroup();
  }

  setLinkedMeterGroup() {
    this.linkedMeterGroup = this.utilityMeterGroups.find(group => {
      return group.guid == this.linkedMeterGroupId;
    });
    if (this.linkedMeterGroupId != this.equipmentDetailsForm.controls['utilityMeterGroupId'].value) {
      this.equipmentDetailsForm.patchValue({
        utilityMeterGroupId: this.linkedMeterGroupId
      });
    }
    // if (this.linkedMeterGroup) {
    // this.setUtilityTypes();
    // }
  }

  // setUtilityTypes() {
  //   let groupMeters: Array<IdbUtilityMeter> = this.utilityMeters.filter(meter => { return meter.groupId == this.linkedMeterGroup.guid; });
  //   let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
  //   sources = _.uniq(sources);
  //   sources.forEach(source => {
  //     if (!this.utilityDataForms.find(udf => { return udf.energySource == source })) {
  //       let years: Array<number> = this.annualOperatingConditionsDataForms.map(form => { return form.controls['year'].value });
  //       let utilityData: EquipmentUtilityData = {
  //         energySource: source,
  //         size: 0,
  //         numberOfEquipment: 1,
  //         units: '',
  //         energyUse: years.map(year => {
  //           return {
  //             year: year,
  //             energyUse: 0,
  //             overrideEnergyUse: false
  //           };
  //         })
  //       };
  //       let newForm: {
  //         energySource: MeterSource,
  //         utilityDataForm: FormGroup,
  //         energyUseForms: Array<FormGroup>
  //       } = this.facilityEnergyUseEquipmentFormService.getUtilityDataForm(utilityData);
  //       this.utilityDataForms.push(newForm);
  //     }
  //   });
  //   //remove any that are not in the meter group
  //   console.log('before filter', this.utilityDataForms);
  //   console.log('sources', sources);
  //   this.utilityDataForms = this.utilityDataForms.filter(udf => { return sources.includes(udf.energySource) });
  //   console.log('after filter', this.utilityDataForms);
  //   this.cd.detectChanges();
  // }

}

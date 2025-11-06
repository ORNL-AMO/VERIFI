import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EquipmentTypes } from './equipmentTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  @Input({ required: true })
  form: FormGroup;

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMetersSub: Subscription;

  showLinkMeterModal: boolean = false;

  linkedMeter: IdbUtilityMeter;
  constructor(private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit() {
    this.utilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.utilityMeters = meters;
      this.setLinkedMeter();
    });
  }

  ngOnDestroy() {
    this.utilityMetersSub.unsubscribe();
  }

  openLinkMeterTable() {
    this.showLinkMeterModal = true;
  }

  changeLinkedMeter(meter: IdbUtilityMeter) {
    if (meter.guid != this.form.controls['utilityMeterId'].value) {
      this.form.patchValue({
        utilityMeterId: meter.guid
      });
    } else {
      this.form.patchValue({
        utilityMeterId: ''
      });
    }
    this.form.markAsDirty()
    this.setLinkedMeter();
  }

  cancelLinkMeter() {
    this.form.patchValue({
      utilityMeterId: ''
    });
    this.showLinkMeterModal = false;
    this.form.markAsDirty()
    this.setLinkedMeter();
  }

  closeLinkMeter() {
    this.showLinkMeterModal = false;
    this.setLinkedMeter();
  }

  setLinkedMeter() {
    this.linkedMeter = this.utilityMeters.find(meter => {
      return meter.guid == this.form.controls['utilityMeterId'].value;
    });
  }
}

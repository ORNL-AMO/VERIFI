import { Component, inject, Input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyFootprintAnnualEquipmentGroupSummary } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualEquipmentGroupSummary';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Component({
  selector: 'app-facility-energy-uses-group-footprint-table',
  standalone: false,
  templateUrl: './facility-energy-uses-group-footprint-table.component.html',
  styleUrl: './facility-energy-uses-group-footprint-table.component.css',
})
export class FacilityEnergyUsesGroupFootprintTableComponent {
  @Input({ required: true })
  set energyFootprintAnnualEquipmentGroupSummary(value: EnergyFootprintAnnualEquipmentGroupSummary | null) {
    this.energyFootprintAnnualEquipmentGroupSummarySignal.set(value);
  }
  get energyFootprintAnnualEquipmentGroupSummary(): EnergyFootprintAnnualEquipmentGroupSummary | null {
    return this.energyFootprintAnnualEquipmentGroupSummarySignal();
  }

  private energyFootprintAnnualEquipmentGroupSummarySignal = signal<EnergyFootprintAnnualEquipmentGroupSummary | null>(null);
  private router = inject(Router);


  goToEquipment(equipment: IdbFacilityEnergyUseEquipment) {
    this.router.navigateByUrl('/data-management/' + equipment.accountId + '/facilities/' + equipment.facilityId + '/energy-uses/' + equipment.energyUseGroupId + '/equipment/' + equipment.guid);
  }


}

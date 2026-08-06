import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { EnergyUsesFacilitySummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-facility-energy-uses-summary',
  standalone: false,
  templateUrl: './facility-energy-uses-summary.component.html',
  styleUrl: './facility-energy-uses-summary.component.css'
})
export class FacilityEnergyUsesSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility$: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  get facility(): IdbFacility {
    return this.facility$();
  }

  facilityEnergyUseGroups$: Signal<Array<IdbFacilityEnergyUseGroup>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]);
  get facilityEnergyUseGroups(): Array<IdbFacilityEnergyUseGroup> {
    return this.facilityEnergyUseGroups$();
  }

  facilityEnergyUseEquipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseEquipment()]);
  get facilityEnergyUseEquipment(): Array<IdbFacilityEnergyUseEquipment> {
    return this.facilityEnergyUseEquipment$();
  }

  energyUsesFacilitySummary$: Signal<EnergyUsesFacilitySummary> = computed(() => {
    const facility = this.facility$();
    const facilityEnergyUseGroups = this.facilityEnergyUseGroups$();
    const facilityEnergyUseEquipment = this.facilityEnergyUseEquipment$();
    if (!facility || !facilityEnergyUseGroups || !facilityEnergyUseEquipment) {
      return null;
    }
    return new EnergyUsesFacilitySummary(facility, facilityEnergyUseGroups, facilityEnergyUseEquipment);
  });
  get energyUsesFacilitySummary(): EnergyUsesFacilitySummary {
    return this.energyUsesFacilitySummary$();
  }

  displayHistory: boolean = false;

}

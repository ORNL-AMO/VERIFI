import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EnergyUsesFacilitySummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
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
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);

  facility$: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  get facility(): IdbFacility {
    return this.facility$();
  }

  facilityEnergyUseGroups$: Signal<Array<IdbFacilityEnergyUseGroup>> = toSignal(this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups, { initialValue: [] });
  get facilityEnergyUseGroups(): Array<IdbFacilityEnergyUseGroup> {
    return this.facilityEnergyUseGroups$();
  }

  facilityEnergyUseEquipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment, { initialValue: [] });
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

import { Component, inject, Input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyFootprintAnnualFacilityBalance } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualFacilityBalance';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-facility-energy-uses-footprint-table',
  standalone: false,
  templateUrl: './facility-energy-uses-footprint-table.component.html',
  styleUrl: './facility-energy-uses-footprint-table.component.css',
})
export class FacilityEnergyUsesFootprintTableComponent {
  @Input({ required: true })
  set energyFootprintAnnualFacilityBalance(value: EnergyFootprintAnnualFacilityBalance | null) {
    this.energyFootprintAnnualFacilityBalanceSignal.set(value);
  }
  get energyFootprintAnnualFacilityBalance(): EnergyFootprintAnnualFacilityBalance | null {
    return this.energyFootprintAnnualFacilityBalanceSignal();
  }
  @Input({ required: true })
  set displayDataByGroup(value: boolean) {
    this.displayDataByGroupSignal.set(value);
  }
  get displayDataByGroup(): boolean {
    return this.displayDataByGroupSignal();
  }

  private displayDataByGroupSignal = signal<boolean>(false);

  private energyFootprintAnnualFacilityBalanceSignal = signal<EnergyFootprintAnnualFacilityBalance | null>(null);

  private router: Router = inject(Router);

  goToGroupFootprint(group: IdbFacilityEnergyUseGroup) {
    this.router.navigateByUrl('data-management/' + group.accountId + '/facilities/' + group.facilityId + '/energy-uses/' + group.guid + '/footprint');
  }
}

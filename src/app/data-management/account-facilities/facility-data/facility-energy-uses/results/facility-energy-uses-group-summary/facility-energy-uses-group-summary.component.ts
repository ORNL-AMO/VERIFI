import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { ActivatedRoute, Router } from '@angular/router';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';

@Component({
  selector: 'app-facility-energy-uses-group-summary',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary.component.html',
  styleUrl: './facility-energy-uses-group-summary.component.css'
})
export class FacilityEnergyUsesGroupSummaryComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);

  facilityEnergyUseEquipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseEquipment()]);

  energyUseGroup$: WritableSignal<IdbFacilityEnergyUseGroup> = signal<IdbFacilityEnergyUseGroup>(null);
  get energyUseGroup(): IdbFacilityEnergyUseGroup {
    return this.energyUseGroup$();
  }

  facility$: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  get facility(): IdbFacility {
    return this.facility$();
  }

  energyUsesGroupSummary$: Signal<EnergyUsesGroupSummary> = computed(() => {
    const energyUseGroup = this.energyUseGroup$();
    const facilityEnergyUseEquipment = this.facilityEnergyUseEquipment$();
    const facility = this.facility$();
    if (!energyUseGroup || !facility) {
      return null;
    }
    return new EnergyUsesGroupSummary(energyUseGroup, facilityEnergyUseEquipment, facility)
  });
  get energyUsesGroupSummary(): EnergyUsesGroupSummary {
    return this.energyUsesGroupSummary$();
  }

  displayHistory: boolean = false;

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      let energyUseGroup = this.accountWorkspaceQuery.getEnergyUseGroupByGuid(groupId);
      if (energyUseGroup) {
        this.energyUseGroup$.set(energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses');
  }

  goToEquipment(equipmentGuid: string) {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + equipmentGuid);
  }
}

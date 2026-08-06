import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Input, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { getGUID } from 'src/app/shared/sharedHelperFunctions';

@Component({
    selector: 'app-energy-use-group-card',
    standalone: false,
    templateUrl: './energy-use-group-card.component.html',
    styleUrl: './energy-use-group-card.component.css'
})
export class EnergyUseGroupCardComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
    @Input({ required: true })
    group: IdbFacilityEnergyUseGroup;

    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
    private router: Router = inject(Router);
    private sharedDataService: SharedDataService = inject(SharedDataService);
    private loadingService: LoadingService = inject(LoadingService);
    private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);


    facilityEnergyUseEquipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseEquipment()]);

    groupEquipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => {
        const equipment = this.facilityEnergyUseEquipment();
        if (!equipment || equipment.length === 0) {
            return [];
        }
        return equipment.filter(equip => equip.energyUseGroupId === this.group.guid);
    });

    numberOfElectricity: Signal<number> = computed(() => {
        const equipment = this.groupEquipment();
        if (!equipment || equipment.length === 0) {
            return 0;
        }
        const equipmentSources: Array<MeterSource> = equipment.flatMap(equip => equip.utilityData.map(utility => utility.energySource));
        return equipmentSources.filter(source => source === "Electricity").length;
    });

    numberOfNaturalGas: Signal<number> = computed(() => {
        const equipment = this.groupEquipment();
        if (!equipment || equipment.length === 0) {
            return 0;
        }
        const equipmentSources: Array<MeterSource> = equipment.flatMap(equip => equip.utilityData.map(utility => utility.energySource));
        return equipmentSources.filter(source => source === "Natural Gas").length;
    });

    numberOfOtherFuels: Signal<number> = computed(() => {
        const equipment = this.groupEquipment();
        if (!equipment || equipment.length === 0) {
            return 0;
        }
        const equipmentSources: Array<MeterSource> = equipment.flatMap(equip => equip.utilityData.map(utility => utility.energySource));
        return equipmentSources.filter(source => source === "Other Fuels").length;
    });

    async editGroup(energyUseGroup: IdbFacilityEnergyUseGroup) {
        let account: IdbAccount = this.accountWorkspaceStore.account();
        let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
        energyUseGroup.sidebarOpen = true;
        await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(energyUseGroup));
        await this.accountWorkspaceService.reloadActiveWorkspace(true);
        this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + energyUseGroup.guid);
    }

    async createCopy() {
        let copyGroup: IdbFacilityEnergyUseGroup = JSON.parse(JSON.stringify(this.group));
        delete copyGroup.id;
        copyGroup.guid = getGUID();
        copyGroup.name = copyGroup.name + ' (copy)';
        copyGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(copyGroup));
        await this.accountWorkspaceService.reloadActiveWorkspace(true);
        this.editGroup(copyGroup);
    }

    showDeleteModal: boolean = false;
    openDeleteModal() {
        this.sharedDataService.modalOpen.next(true);
        this.showDeleteModal = true;
    }

    cancelDelete() {
        this.sharedDataService.modalOpen.next(false);
        this.showDeleteModal = false;
    }

    async deleteGroup() {
        let deleteGroupId: number = this.group.id;
        let deleteGroupGuid: string = this.group.guid;
        this.loadingService.setLoadingMessage('Deleting Energy Use Group...')
        this.loadingService.setLoadingStatus(true);
        //delete groups
        await firstValueFrom(this.facilityEnergyUseGroupsDbService.deleteWithObservable(deleteGroupId));
        //delete equipment associated with group
        await this.facilityEnergyUseEquipmentDbService.deleteEnergyUseGroup(deleteGroupGuid);
        //set groups
        await this.accountWorkspaceService.reloadActiveWorkspace(true);
        //set equipment
        await this.accountWorkspaceService.reloadActiveWorkspace(true);
        this.cancelDelete();
        this.loadingService.setLoadingStatus(false);
        this.toastNotificationsService.showToast("Energy Use Group Deleted", undefined, undefined, false, "alert-success");
    }

    goToEquipment(equipment: IdbFacilityEnergyUseEquipment) {
        this.router.navigateByUrl('data-management/' + equipment.accountId + '/facilities/' + equipment.facilityId + '/energy-uses/' + equipment.energyUseGroupId + '/equipment/' + equipment.guid);
    }

}

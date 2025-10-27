import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first, firstValueFrom, Observable, of, Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupFormService } from './facility-energy-use-group-form.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Component({
  selector: 'app-facility-energy-use-group',
  standalone: false,
  templateUrl: './facility-energy-use-group.component.html',
  styleUrl: './facility-energy-use-group.component.css'
})
export class FacilityEnergyUseGroupComponent {
  facility: IdbFacility;
  facilitySub: Subscription;

  energyUseGroup: IdbFacilityEnergyUseGroup;
  form: FormGroup;

  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  facilityEnergyUseEquipmentSub: Subscription;

  showDeleteGroup: boolean = false;
  sourceOptions: Array<MeterSource> = AllSources;
  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseGroupFormService: FacilityEnergyUseGroupFormService,
    private sharedDataService: SharedDataService,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private toastNotificationsService: ToastNotificationsService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService
  ) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

    this.facilityEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.subscribe(equipment => {
      this.facilityEnergyUseEquipment = equipment;
    });

    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      this.energyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(groupId);
      if (this.energyUseGroup) {
        this.form = this.facilityEnergyUseGroupFormService.getFormFromEnergyUseGroup(this.energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseEquipmentSub.unsubscribe();
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.form.markAsPristine();
    // this.energyUseGroup = this.utilityMeterDbService.getFacilityMeterById(this.utilityMeter.guid);
    this.energyUseGroup = this.facilityEnergyUseGroupFormService.updateEnergyUseGroupFromForm(this.energyUseGroup, this.form);
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(this.energyUseGroup));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteGroup = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteGroup = false;
  }

  async deleteGroup() {
    this.showDeleteGroup = false;
    this.form.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Energy Use Group...')
    this.loadingService.setLoadingStatus(true);
    //delete groups
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.deleteWithObservable(this.energyUseGroup.id));
    //delete equipment associated with group
    await this.facilityEnergyUseEquipmentDbService.deleteEnergyUseGroup(this.energyUseGroup.guid);
    //set groups
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, selectedFacility);
    //set equipment
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Group Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses')
  }

  canDeactivate(): Observable<boolean> {
    if (this.form && this.form.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  async addEquipment() {
    let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(this.energyUseGroup);
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(newEquipment));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, facility);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + newEquipment.guid);
  }
}

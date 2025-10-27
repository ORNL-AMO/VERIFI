import { Component } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of, Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EnergyUseGroupEquipment, getNewEnergyUseEquipment, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupFormService } from './facility-energy-use-group-form.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';

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
    private toastNotificationsService: ToastNotificationsService
  ) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.energyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(meterId);
      if (this.energyUseGroup) {
        this.form = this.facilityEnergyUseGroupFormService.getFormFromEnergyUseGroup(this.energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
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
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
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
    //set groups
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, selectedFacility);
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
    let newEquipment: EnergyUseGroupEquipment = getNewEnergyUseEquipment(this.energyUseGroup.guid);
    this.energyUseGroup.equipmentItems.push(newEquipment);
    this.form = this.facilityEnergyUseGroupFormService.getFormFromEnergyUseGroup(this.energyUseGroup);
    console.log(this.form);
    await this.saveChanges();
  }
}

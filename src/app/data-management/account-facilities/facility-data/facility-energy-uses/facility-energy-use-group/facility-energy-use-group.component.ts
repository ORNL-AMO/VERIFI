import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

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

  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService
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
        // this.facilityEnergyUseGroupsDbService.selectedEnergyUseGroup.next(this.energyUseGroup);
        // this.meterForm = this.editMeterFormService.getFormFromMeter(this.energyUseGroup);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    
  }

  // async saveChanges() {
  //   this.loadingService.setLoadingMessage('Saving Meter...');
  //   this.loadingService.setLoadingStatus(true);
  //   this.meterForm.markAsPristine();
  //   this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.utilityMeter.guid);
  //   this.utilityMeter = this.editMeterFormService.updateMeterFromForm(this.utilityMeter, this.meterForm);
  //   await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.utilityMeter));
  //   await this.updateMeterData(this.utilityMeter);
  //   let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  //   this.loadingService.setLoadingStatus(false);
  // }

  // showDelete() {
  //   this.sharedDataService.modalOpen.next(true);
  //   this.showDeleteMeter = true;
  // }

  // cancelDelete() {
  //   this.sharedDataService.modalOpen.next(false);
  //   this.showDeleteMeter = false;
  // }

  // async deleteMeter() {
  //   this.showDeleteMeter = false;
  //   this.meterForm.markAsPristine();
  //   this.loadingService.setLoadingMessage('Deleting Meters and Data...')
  //   this.loadingService.setLoadingStatus(true);
  //   //delete meter
  //   await firstValueFrom(this.utilityMeterDbService.deleteIndexWithObservable(this.utilityMeter.id));
  //   //delete meter data
  //   let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.utilityMeterDataDbService.getAll());
  //   let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(meterData => { return meterData.meterId == this.utilityMeter.guid });
  //   for (let index = 0; index < meterData.length; index++) {
  //     await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(meterData[index].id));
  //   }

  //   let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   //set meters
  //   await this.dbChangesService.setMeters(account, selectedFacility);
  //   //set meter data
  //   await this.dbChangesService.setMeterData(account, selectedFacility);
  //   this.cancelDelete();
  //   this.loadingService.setLoadingStatus(false);
  //   this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
  //   this.goToMeterList();
  // }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses')
  }

  // canDeactivate(): Observable<boolean> {
  //   if (this.meterForm && this.meterForm.dirty) {
  //     const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
  //     return of(result);
  //   }
  //   return of(true);
  // }
}

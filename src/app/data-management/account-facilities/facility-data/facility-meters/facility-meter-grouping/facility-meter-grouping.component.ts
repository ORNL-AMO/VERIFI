import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-facility-meter-grouping',
  standalone: false,

  templateUrl: './facility-meter-grouping.component.html',
  styleUrl: './facility-meter-grouping.component.css'
})
export class FacilityMeterGroupingComponent {

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;

  facility: IdbFacility;
  facilitySub: Subscription;

  facilityMeterGroupsSub: Subscription;
  energyGroups: Array<IdbUtilityMeterGroup>;
  waterGroups: Array<IdbUtilityMeterGroup>;
  otherGroups: Array<IdbUtilityMeterGroup>;

  hasEnergyMeters: boolean;
  hasWaterMeters: boolean;

  showEditGroupForm: boolean;
  groupToEdit: IdbUtilityMeterGroup;
  ungroupedMeters: Array<IdbUtilityMeter>;
  groupToDelete: IdbUtilityMeterGroup;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private analysisDbService: AnalysisDbService,
    private accountReportDbService: AccountReportDbService,
    private toastNoticationService: ToastNotificationsService
  ) {
  }


  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.facilityMeters = meters;
      this.hasEnergyMeters = this.facilityMeters.find(meter => { return meter.includeInEnergy }) != undefined;
      this.hasWaterMeters = this.facilityMeters.find(meter => { return meter.source == 'Water Discharge' || meter.source == 'Water Intake' }) != undefined;
      this.ungroupedMeters = this.facilityMeters.filter(meter => { return meter.groupId == undefined })
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(facilityMeterGroups => {
      this.otherGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Other' });
      this.waterGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Water' });
      this.energyGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Energy' });
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.facilityMeterGroupsSub.unsubscribe();
  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/import-data');
  }

  async addMeter() {
    let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(this.facility.guid, this.facility.accountId, true, this.facility.energyUnit);
    newMeter = await firstValueFrom(this.utilityMeterDbService.addWithObservable(newMeter));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(account, this.facility);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + this.facility.guid + '/meters/' + newMeter.guid);
  }

  addGroup() {
    this.showEditGroupForm = true;
  }

  closeGroupForm() {
    this.showEditGroupForm = false;
    this.groupToEdit = undefined;
  }

  setEditGroup(group: IdbUtilityMeterGroup) {
    this.groupToEdit = group;
    this.showEditGroupForm = true;
  }

  setDeleteGroup(group: IdbUtilityMeterGroup) {
    this.groupToDelete = group;
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }


  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await firstValueFrom(this.utilityMeterGroupDbService.deleteWithObservable(this.groupToDelete.id));
    await this.dbChangesService.setMeterGroups(selectedAccount, this.facility);
    let groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == this.groupToDelete.guid });
    for (let i = 0; i < groupMeters.length; i++) {
      let meter: IdbUtilityMeter = groupMeters[i];
      meter.groupId = undefined;
      await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter))
    }
    await this.dbChangesService.setMeters(selectedAccount, this.facility);
    //update analysis items
    await this.analysisDbService.deleteGroup(this.groupToDelete.guid);
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.facility);
    //update BCC reports
    await this.accountReportDbService.updateReportsRemoveGroup(this.groupToDelete.guid);
    await this.dbChangesService.setAccountReports(selectedAccount);
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "alert-success");
  }
}

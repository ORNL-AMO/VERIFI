import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbFacility, IdbOverviewReportOptions } from 'src/app/models/idb';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-facility-settings',
  templateUrl: './facility-settings.component.html',
  styleUrls: ['./facility-settings.component.css']
})
export class FacilitySettingsComponent implements OnInit {

  showDeleteFacility: boolean = false;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean;
  canDelete: boolean;
  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService
  ) { }

  ngOnInit() {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    // this.canDelete = accountFacilites.length > 1;
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }


  async facilityDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    // Delete all info associated with account
    await this.predictorDbService.deleteAllFacilityPredictors(this.selectedFacility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(this.selectedFacility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(this.selectedFacility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(this.selectedFacility.guid);
    this.loadingService.setLoadingMessage('Updating Reports...');
    let overviewReportOptions: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let index = 0; index < overviewReportOptions.length; index++) {
      overviewReportOptions[index].reportOptions.facilities = overviewReportOptions[index].reportOptions.facilities.filter(reportFacility => { return reportFacility.facilityId != this.selectedFacility.guid });
      await this.overviewReportOptionsDbService.updateWithObservable(overviewReportOptions[index]).toPromise();
    }
    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([this.selectedFacility]);
    // Then navigate to another facility
    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    // this.facilityDbService.allFacilities.next(allFacilities);
    let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == selectedAccount.guid });
    this.facilityDbService.accountFacilities.next(accountFacilites);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, "success");
    this.router.navigate(['/']);
  }

  openDeleteFacility() {
    this.showDeleteFacility = true;
  }

  async confirmDelete() {
    this.showDeleteFacility = undefined;
    await this.facilityDelete();
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

  backupFacility() {
    this.backupDataService.backupFacility(this.selectedFacility);
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = true;
    this.importBackupModalService.showModal.next(true);
  }

}

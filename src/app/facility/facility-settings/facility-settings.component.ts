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
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }


  async facilityDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.deleteFacility(this.selectedFacility, selectedAccount);
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

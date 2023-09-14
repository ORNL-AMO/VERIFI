import { Injectable } from '@angular/core';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbAccount } from '../models/idb';
import { ElectronService } from './electron.service';
import { BackupDataService, BackupFile } from '../shared/helper-services/backup-data.service';
import { AccountAnalysisDbService } from '../indexedDB/account-analysis-db.service';
import { AccountReportDbService } from '../indexedDB/account-report-db.service';
import { CustomEmissionsDbService } from '../indexedDB/custom-emissions-db.service';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from '../indexedDB/db-changes.service';

@Injectable({
  providedIn: 'root'
})
export class AutomaticBackupsService {

  account: IdbAccount;
  backupTimer: any;
  fileExists: boolean;
  constructor(
    private accountDbService: AccountdbService,
    private electronService: ElectronService,
    private backupDataService: BackupDataService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private accountReportDbService: AccountReportDbService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private predictorsDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService
  ) {
    this.electronService.fileExists.subscribe(val => {
      this.fileExists = val;
    })
  }

  subscribeData() {
    if (this.electronService.isElectron) {
      this.accountDbService.selectedAccount.subscribe(val => {
        this.account = val;
        this.saveBackup();
      });

      this.accountAnalysisDbService.accountAnalysisItems.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });

      this.accountReportDbService.accountReports.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });

      this.customEmissionsDbService.accountEmissionsItems.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });

      this.analysisDbService.accountAnalysisItems.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });
      this.facilityDbService.accountFacilities.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });
      this.predictorsDbService.accountPredictorEntries.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });
      this.utilityMeterDbService.accountMeters.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });
      this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      });
      this.utilityMeterGroupDbService.accountMeterGroups.subscribe(val => {
        if (val) {
          this.saveBackup();
        }
      })
    }
  }

  saveBackup() {
    if (this.account && this.account.dataBackupFilePath) {
      console.log('save...');
      if (this.backupTimer) {
        clearTimeout(this.backupTimer)
      }
      //backup 3 seconds after changes finish...
      this.backupTimer = setTimeout(() => {
        this.electronService.checkFileExists(this.account.dataBackupFilePath);
        setTimeout(() => {
          if (this.fileExists) {
            let backupFile: BackupFile = this.backupDataService.getAccountBackupFile();
            this.account.lastBackup = new Date();
            this.electronService.sendSaveData(backupFile)
          } else {
            console.log('tried to save but there is no file')
            this.toastNotificationService.showToast('Missing Backup File', 'The file selected to backup this account no longer exists. Please navigate to the settings page for the account to update the file selection.', 10000, false, 'alert-danger')
            this.account.dataBackupFilePath = undefined;
            this.dbChangesService.updateAccount(this.account);
          }
        }, 500);
      }, 3000);
    }
  }

}

import { Injectable } from '@angular/core';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbAccount } from '../models/idb';
import { ElectronService } from './electron.service';
import { BackupDataService, BackupFile } from '../shared/helper-services/backup-data.service';

@Injectable({
  providedIn: 'root'
})
export class AutomaticBackupsService {

  account: IdbAccount;
  backupTimer: any;
  constructor(
    private accountDbService: AccountdbService,
    private electronService: ElectronService,
    private backupDataService: BackupDataService
  ) { }

  subscribeData() {
    if (this.electronService.isElectron) {
      this.accountDbService.selectedAccount.subscribe(val => {
        this.account = val;
        if (this.account && this.account.dataBackupFilePath) {
          this.saveBackup();
        }
      });
    }
  }

  saveBackup(){
    console.log('save backup!!');
    if(this.backupTimer){
      clearTimeout(this.backupTimer)
    }
    //backup 30 seconds after changes finish...
    this.backupTimer = setTimeout(() => {
      console.log('send save...')
      let backupFile: BackupFile = this.backupDataService.getAccountBackupFile();
      this.electronService.sendSaveData(backupFile)      
    }, 10000);
  }

}

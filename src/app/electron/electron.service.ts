import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from '../models/idb';
import { BackupFile } from '../shared/helper-services/backup-data.service';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {


  updateAvailable: BehaviorSubject<boolean>;
  updateInfo: BehaviorSubject<{ releaseName: string, releaseNotes: string }>;
  updateError: BehaviorSubject<boolean>;
  isElectron: boolean;
  savedFilePath: BehaviorSubject<string>;
  fileExists: BehaviorSubject<boolean>;
  constructor(private localStorageService: LocalStorageService, private toastNotificationService: ToastNotificationsService) {
    this.savedFilePath = new BehaviorSubject<string>(undefined);
    this.updateAvailable = new BehaviorSubject<boolean>(false);
    this.updateInfo = new BehaviorSubject<{ releaseName: string, releaseNotes: string }>(undefined);
    this.updateError = new BehaviorSubject<boolean>(false);
    this.fileExists = new BehaviorSubject<boolean>(false);
    this.isElectron = window["electronAPI"]
    if (this.isElectron) {
      this.listen();
    } else {
      console.warn('Electron\'s IPC was not loaded');
      let disableWebDisclaimer: boolean = this.localStorageService.retrieve("disableWebDisclaimer");
      if (!disableWebDisclaimer) {
        this.showWebDisclaimer();
      }
    }
  }

  //listens for messages from electron about updates
  listen(): void {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].on("release-info", (data: { releaseName: string, releaseNotes: string }) => {
      console.log('release-info');
      console.log(data)
      this.updateInfo.next(data);
    });
    window["electronAPI"].on("available", (data) => {
      console.log('available');
      console.log(data)
      this.updateAvailable.next(true);
    });
    window["electronAPI"].on("error", (data) => {
      console.log('error');
      console.log(data)
      this.updateError.next(true);
    });
    window["electronAPI"].on("update-downloaded", (data) => {
      console.log('update-downloaded');
      console.log(data)
    });

    window["electronAPI"].on("file-path", (data) => {
      this.savedFilePath.next(data);
    });


    window["electronAPI"].on("file-exists", (data) => {
      console.log('results: ' + data);
      this.fileExists.next(data == 'file');
    });
  }

  //Used to tell electron that app is ready
  //does nothing when in browser
  sendAppReady(data: any): void {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("ready", data);
  }

  //send signal to ipcMain to update
  sendUpdateSignal() {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("update");
  }

  sendAppRelaunch() {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("relaunch");
  }


  sendSaveData(backupFile: BackupFile) {
    console.log('send save to electron');
    console.log('===');
    if (!window["electronAPI"] || !backupFile) {
      return;
    }
    let args: { fileName: string, fileData: any } = {
      fileName: undefined,
      fileData: backupFile
    }
    if (backupFile.account.dataBackupFilePath) {
      args.fileName = backupFile.account.dataBackupFilePath;
    } else {
      args.fileName = backupFile.account.name + '.json';
    }
    window["electronAPI"].send("saveData", args);
  }

  checkFileExists(dataBackupFilePath: string) {
    console.log('check exists!')
    if (!window["electronAPI"] || !dataBackupFilePath) {
      return;
    }
    let args: { fileName: string } = {
      fileName: dataBackupFilePath
    }
    window["electronAPI"].send("fileExists", args);
  }

  openDialog(backupFile: BackupFile) {
    console.log('open dialog!')
    if (!window["electronAPI"]) {
      return;
    }
    let args: { fileName: string, fileData: any } = {
      fileName: undefined,
      fileData: backupFile
    }
    if (backupFile.account.dataBackupFilePath) {
      args.fileName = backupFile.account.dataBackupFilePath;
    } else {
      args.fileName = backupFile.account.name + '.json';
    }
    window["electronAPI"].send("openDialog", args);

  }


  showWebDisclaimer() {
    let title: string = "VERIFI Web";
    let body: string = `You are running VERIFI in a web browser. All application data is saved within this browser (The DOE does not have access to your data). 
      It is encouraged that you download backup files of your data frequently. Backups can be uploaded to restore lost or corrupted data. <br> <hr>
      You can download data backups using the "Backup Account" button in the upper right hand corner of your screen or the account and facility settings pages.`
    this.toastNotificationService.showToast(title, body, 50000, true, "alert-info");
    let disableNotificationSub: Subscription = this.toastNotificationService.disableNotification.subscribe(val => {
      if (val != undefined) {
        if (val == true) {
          this.localStorageService.store('disableWebDisclaimer', true);
        }
        disableNotificationSub.unsubscribe();
      }
    });
  }
}

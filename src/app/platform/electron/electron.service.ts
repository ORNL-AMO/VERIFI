import { Injectable, OnDestroy } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { BackupFile } from '@data/models/backup-file';
import { ElectronUpdateState } from './electron-update.models';

@Injectable({
  providedIn: 'root'
})
export class ElectronService implements OnDestroy {

  readonly updateState = new BehaviorSubject<ElectronUpdateState>({ status: 'idle' });
  readonly updateRequested = new BehaviorSubject<number>(0);
  private readonly listeners: Array<() => void> = [];
  private listening = false;

  updateAvailable: BehaviorSubject<boolean>;
  updateInfo: BehaviorSubject<{ releaseName: string, releaseNotes: string }>;
  updateError: BehaviorSubject<boolean>;
  isElectron: boolean;
  savedUtilityFilePath: { [key: string]: BehaviorSubject<string> } = {};
  fileDeletedSubject: { [key: string]: BehaviorSubject<boolean> } = {};
  folderPathSubject: BehaviorSubject<string>;
  folderErrorSubject: BehaviorSubject<string>;;
  currentKey: string;
  constructor(private localStorageService: LocalStorageService, private toastNotificationService: ToastNotificationsService) {
    this.updateAvailable = new BehaviorSubject<boolean>(false);
    this.updateInfo = new BehaviorSubject<{ releaseName: string, releaseNotes: string }>(undefined);
    this.updateError = new BehaviorSubject<boolean>(false);
    this.folderPathSubject = new BehaviorSubject<string>(null);
    this.folderErrorSubject = new BehaviorSubject<string>(null);
    this.isElectron = Boolean(window["electronAPI"]);
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
    if (!window["electronAPI"] || this.listening) {
      return;
    }
    this.listening = true;
    this.on('update-status', (data: ElectronUpdateState) => {
      this.updateState.next(data);
      this.updateAvailable.next(['available', 'downloading', 'downloaded', 'installing'].includes(data.status) || (data.status === 'error' && data.operation === 'download'));
      this.updateError.next(data.status === 'error');
      this.updateInfo.next(data.version ? { releaseName: data.releaseName || data.version, releaseNotes: '' } : undefined);
    });

    this.on("utility-file-path", (path: string) => {
      console.log('electron service utility-file-path...');
      this.checkKeyExists(this.currentKey);
      if (this.currentKey && this.savedUtilityFilePath[this.currentKey]) {
        this.savedUtilityFilePath[this.currentKey].next(path);
        this.fileDeletedSubject[this.currentKey].next(false);
      }
    });

    this.on("utility-file-exists", (exists: boolean) => {
      console.log('electron service utility-file-exists...');
      this.checkKeyExists(this.currentKey);
      if (this.currentKey && this.fileDeletedSubject[this.currentKey]) {
        this.fileDeletedSubject[this.currentKey].next(!exists);
        if (!exists) {
          // this.savedUtilityFilePath[this.currentKey].next(null);
        }
      }
    });

    this.on("folder-exists", ({ exists, folderPath }: { exists: boolean, folderPath: string }) => {
      const currentFolderPath = this.folderPathSubject.value;
      if (!exists && currentFolderPath === folderPath) {
        this.folderPathSubject.next(null);
        this.folderErrorSubject.next('Deleted');
      }
      else {
        this.folderErrorSubject.next(null);
      }
    });

    this.on("folder-selected", (path: string) => {
      this.folderPathSubject.next(path);
      this.folderErrorSubject.next(null);
    });

    this.on("bill-disconnected", (data: { success: boolean }) => {
      if (data.success) {
        this.savedUtilityFilePath[this.currentKey].next(null);
      } else {
        console.log('Error disconnecting bill');
      }
    });
  }

  private on<T>(channel: string, listener: (data: T) => void): void {
    const unsubscribe = window['electronAPI'].on(channel, listener);
    if (typeof unsubscribe === 'function') this.listeners.push(unsubscribe);
  }

  ngOnDestroy(): void {
    this.listeners.splice(0).forEach(unsubscribe => unsubscribe());
    this.listening = false;
  }

  showUpdate(): void {
    this.updateRequested.next(this.updateRequested.value + 1);
  }

  retryUpdate(): void {
    if (this.updateState.value.operation === 'download') this.sendUpdateSignal();
    else window['electronAPI']?.send('check-for-updates');
  }

  async installUpdate(): Promise<boolean> {
    if (!window['electronAPI']?.invoke) return false;
    return Boolean(await window['electronAPI'].invoke('quit-and-install'));
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

  async chooseBackupSavePath(defaultPath: string): Promise<string | undefined> {
    if (!window["electronAPI"]?.invoke) {
      return undefined;
    }
    return window["electronAPI"].invoke('backup:chooseSavePath', { defaultPath });
  }

  async backupFileExists(path: string): Promise<boolean> {
    if (!window["electronAPI"]?.invoke || !path) {
      return false;
    }
    const result = await window["electronAPI"].invoke('backup:exists', { path });
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not check the backup file.');
    }
    return Boolean(result.exists);
  }

  async readBackupFile(path: string): Promise<unknown> {
    if (!window["electronAPI"]?.invoke || !path) {
      return undefined;
    }
    const result = await window["electronAPI"].invoke('backup:read', { path });
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not read the backup file.');
    }
    return result.data;
  }

  async writeBackupFile(path: string, backup: BackupFile): Promise<void> {
    if (!window["electronAPI"]?.invoke || !path) {
      return;
    }
    const result = await window["electronAPI"].invoke('backup:write', { path, backup });
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not write the backup file.');
    }
  }

  selectFile(key: string, folderPath: string, meterNumber: string, date: string) {
    console.log('Inside selectFile()');
    if (!window["electronAPI"]) {
      return;
    }
    this.checkKeyExists(key);
    this.currentKey = key;
    window["electronAPI"].send("uploadFileDialog", { key, folderPath, meterNumber, date });
  }

  checkKeyExists(key: string) {
    if (!this.savedUtilityFilePath[key]) {
      this.savedUtilityFilePath[key] = new BehaviorSubject<string>(null);
    }
    if (!this.fileDeletedSubject[key]) {
      this.fileDeletedSubject[key] = new BehaviorSubject<boolean>(false);
    }
  }

  getFilePath(key: string): Observable<string> {
    this.checkKeyExists(key);
    return this.savedUtilityFilePath[key].asObservable();
  }

  getDeletedFile(key: string): Observable<boolean> {
    this.checkKeyExists(key);
    return this.fileDeletedSubject[key].asObservable();
  }

  getFolderPath(): Observable<string> {
    return this.folderPathSubject.asObservable();
  }

  getFolderError(): Observable<string> {
    return this.folderErrorSubject.asObservable();
  }

  openFileLocation(key: string) {
    this.currentKey = key;
    const path = this.savedUtilityFilePath[this.currentKey].value;
    this.checkUtilityFileExists(this.currentKey, path);
    window["electronAPI"].send("openUploadedFileLocation", path);

  }

  selectFolder() {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("selectFolder");
  }

  openBillsFolder(folderPath: string) {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("openBillsFolder", folderPath);
  }

  disconnectBill(key: string) {
    this.currentKey = key;
    const path = this.savedUtilityFilePath[this.currentKey].value;
    window["electronAPI"].send("disconnectBill",  path);
  }

  checkBillFolderExists() {
    if (!window["electronAPI"]) {
      return;
    }
    const currentFolderPath = this.folderPathSubject.value;
    if (currentFolderPath) {
      window["electronAPI"].send("checkFolderExists", currentFolderPath);
    }
  }

  checkUtilityFileExists(key: string, path: string) {
    if (!window["electronAPI"]) {
      return;
    }
    this.checkKeyExists(key);
    this.currentKey = key;
    window["electronAPI"].send("utilityFileExists", path);
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

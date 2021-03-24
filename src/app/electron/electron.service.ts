import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {


  updateAvailable: BehaviorSubject<boolean>;
  updateInfo: BehaviorSubject<{releaseName: string, releaseNotes: string}>;
  updateError: BehaviorSubject<boolean>;
  constructor() {
    this.updateAvailable = new BehaviorSubject<boolean>(false);
    this.updateInfo = new BehaviorSubject<{releaseName: string, releaseNotes: string}>(undefined);
    this.updateError = new BehaviorSubject<boolean>(false);
    if (window["electronAPI"]) {
      this.listen();
    } else {
      console.warn('Electron\'s IPC was not loaded');
    }
  }

  //listens for messages from electron about updates
  listen(): void {
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].on("release-info", (data: {releaseName: string, releaseNotes: string}) => {
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
  sendUpdateSignal(){
    if (!window["electronAPI"]) {
      return;
    }
    window["electronAPI"].send("update");
  }
}

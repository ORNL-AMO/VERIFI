import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  constructor() {
    if (window["api"]) {
      this.on();
    } else {
      console.warn('Electron\'s IPC was not loaded');
    }
  }

  on(): void {
    if (!window["api"]) {
      return;
    }
    window["api"].on("pong", (data) => {
      console.log(data)
    });
  }

  send(data: any): void {
    if (!window["api"]) {
      return;
    }
    window["api"].send("ready", data);
  }
}

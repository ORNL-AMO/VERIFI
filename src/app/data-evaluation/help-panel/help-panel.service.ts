import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelpPanelService {

  helpPanelOpen: BehaviorSubject<boolean>;
  constructor(private localStorageService: LocalStorageService) {
    let helpPanelOpen: boolean = this.localStorageService.retrieve("helpPanelOpen");
    if (helpPanelOpen == undefined) {
      helpPanelOpen = true;
    }
    this.helpPanelOpen = new BehaviorSubject<boolean>(helpPanelOpen);

    this.helpPanelOpen.subscribe(helpPanelOpen => {
      this.localStorageService.store('helpPanelOpen', helpPanelOpen);
    });
  }


  getHelpURL(url: string, helpUrlComponents): string {
    for (let helpUrl of Object.keys(helpUrlComponents)) {
      let urlComponent = helpUrlComponents[helpUrl];
      if (typeof urlComponent === 'string') {
        if (url.indexOf(urlComponent) !== -1) {
          return helpUrl;
        }
      }
      else {
        let allStringsMatch = true;
        for (let string of urlComponent) {
          allStringsMatch = allStringsMatch && (url.indexOf(string) !== -1);
        }
        if (allStringsMatch) {
          return helpUrl;
        }
      }
    }
    return '';
  }
}

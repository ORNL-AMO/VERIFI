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
}

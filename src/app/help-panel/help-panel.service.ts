import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelpPanelService {

  helpPanelOpen: BehaviorSubject<boolean>;
  constructor() { 
    this.helpPanelOpen = new BehaviorSubject<boolean>(false);
  }
}

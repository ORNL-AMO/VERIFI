import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from './help-panel.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-help-panel',
    templateUrl: './help-panel.component.html',
    styleUrls: ['./help-panel.component.css'],
    standalone: false
})
export class HelpPanelComponent implements OnInit {

  helpPanelOpen: boolean;
  helpURL: string;
  routerSub: Subscription;
  helpPanelOpenSub: Subscription;
  constructor(
    private router: Router,
    private helpPanelService: HelpPanelService
  ) {
  }

  ngOnInit() {
    this.helpPanelOpenSub = this.helpPanelService.helpPanelOpen.subscribe(helpPanelOpen => {
      this.helpPanelOpen = helpPanelOpen
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    });

    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setHelpURL(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setHelpURL(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this.helpPanelOpenSub.unsubscribe();
  }

  closePanel() {
    this.helpPanelService.helpPanelOpen.next(false);
  }

  setHelpURL(url: string) {
    let componentOptions: Array<string> = [
      'upload',
      'help',
      'facility',
      'account',
      'weather-data'
    ]
    let urlSplit: Array<string> = url.split('/');
    let firstUrl: string = urlSplit[1];
    this.helpURL = componentOptions.find(option => {
      return firstUrl == option;
    });
  }

}

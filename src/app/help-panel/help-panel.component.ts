import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from './help-panel.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css']
})
export class HelpPanelComponent implements OnInit {

  helpPanelOpen: boolean;
  helpURL: string;
  routerSub: Subscription;
  constructor(
    private router: Router,
    private helpPanelService: HelpPanelService
  ) {
  }

  ngOnInit() {
    this.helpPanelService.helpPanelOpen.subscribe(helpPanelOpen => {
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

  ngOnDestroy(){
    this.routerSub.unsubscribe();
  }

  closePanel() {
    this.helpPanelService.helpPanelOpen.next(false);
  }

  setHelpURL(url: string) {
    let componentOptions: Array<string> = [
      'upload',
      'setup-wizard'
    ]
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });

    // <component name>: <URL component> or [<URL component 1>, <URL component 2>, ...]
    // const helpUrlComponents = {
    //   'energy-consumption': 'energy-consumption',
    //   'account-summary': 'account-summary',
    //   'facility-summary': 'facility-summary',
    //   'monthly-meter-data': 'monthly-meter-data',
    //   'meter-groups': 'meter-groups',
    //   'predictors': 'predictors',
    //   'visualization': 'visualization',
    //   'upload-data': 'upload-data',
    //   'facility-management': 'facility-management',
    //   'account-management': 'account-management',
    //   'report-dashboard': 'report-dashboard',
    //   'report-menu': 'report-menu',
    //   'basic-report': 'basic-report',
    //   'account-analysis-dashboard': 'account/analysis/dashboard',
    //   'account-analysis-setup': 'account/analysis',
    //   'analysis-dashboard': 'analysis-dashboard',
    //   'analysis-setup': 'analysis-setup',
    //   'group-analysis-options': ['and', 'group-analysis', 'options'],
    //   'annual-energy-intensity': 'annual-energy-intensity',
    //   'monthly-energy-intensity': 'monthly-energy-intensity',
    //   'facility-analysis': 'facility-analysis',
    //   'help': 'help',
    //   '': ''
    // }

    // this.helpURL = this.helpPanelService.getHelpURL(url, helpUrlComponents);
    // for (let helpUrl of Object.keys(helpUrlComponents)) {
    //   let urlComponent = helpUrlComponents[helpUrl];
    //   if (typeof urlComponent === 'string') {
    //     if (url.indexOf(urlComponent) !== -1) {
    //       this.helpURL = helpUrl;
    //       return;
    //     }
    //   }
    //   else {
    //     let allStringsMatch = true;
    //     for (let string of urlComponent) {
    //       allStringsMatch = allStringsMatch && (url.indexOf(string) !== -1);
    //     }
    //     if (allStringsMatch) {
    //       this.helpURL = helpUrl;
    //       return;
    //     }
    //   }
    // }
  }

}

import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from './help-panel.service';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css']
})
export class HelpPanelComponent implements OnInit {

  helpPanelOpen: boolean;
  helpURL: string;
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

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setHelpURL(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setHelpURL(this.router.url);
  }

  closePanel() {
    this.helpPanelService.helpPanelOpen.next(false);
  }

  setHelpURL(url: string) {
    if (url.indexOf('energy-consumption') != -1) {
      this.helpURL = 'energy-consumption';
    } else if (url.indexOf('account-summary') != -1) {
      this.helpURL = 'account-summary';
    } else if (url.indexOf('facility-summary') != -1) {
      this.helpURL = 'facility-summary';
    } else if (url.indexOf('monthly-meter-data') != -1) {
      this.helpURL = 'monthly-meter-data';
    } else if (url.indexOf('meter-groups') != -1) {
      this.helpURL = 'meter-groups';
    } else if (url.indexOf('predictors') != -1) {
      this.helpURL = 'predictors';
    } else if (url.indexOf('visualization') != -1) {
      this.helpURL = 'visualization';
    } else if (url.indexOf('upload-data') != -1) {
      this.helpURL = 'upload-data';
    } else if (url.indexOf('facility-management') != -1) {
      this.helpURL = 'facility-management';
    } else if (url.indexOf('account-management') != -1) {
      this.helpURL = 'account-management';
    } else if (url.indexOf('report-dashboard') != -1) {
      this.helpURL = 'report-dashboard';
    } else if (url.indexOf('report-menu') != -1) {
      this.helpURL = 'report-menu';
    } else if (url.indexOf('basic-report') != -1) {
      this.helpURL = 'basic-report';
    } else if (url.indexOf('analysis-dashboard') != -1) {
      this.helpURL = 'analysis-dashboard';
    } else if (url.indexOf('analysis-setup') != -1) {
      this.helpURL = 'analysis-setup';
    } else if (url.indexOf('group-analysis') != -1 && url.indexOf('options') != -1) {
      this.helpURL = 'group-analysis-options';
    } else if (url.indexOf('annual-energy-intensity') != -1) {
      this.helpURL = 'annual-energy-intensity';
    } else if (url.indexOf('monthly-energy-intensity') != -1) {
      this.helpURL = 'monthly-energy-intensity';
    } else if (url.indexOf('facility-analysis') != -1) {
      this.helpURL = 'facility-analysis';
    }
  }

}

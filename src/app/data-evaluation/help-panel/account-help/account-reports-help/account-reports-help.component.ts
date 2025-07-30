import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-account-reports-help',
    templateUrl: './account-reports-help.component.html',
    styleUrls: ['./account-reports-help.component.css'],
    standalone: false
})
export class AccountReportsHelpComponent {

  helpURL: 'dashboard' | 'setup' | 'data-overview-report' | 'better-plants' | 'analysis-report' | 'better-climate-report';
  routerSub: Subscription;
  constructor(private router: Router) {
  }

  ngOnInit() {
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
  }

  setHelpURL(url: string) {
    if (url.includes('dashboard')) {
      this.helpURL = 'dashboard';
    } else if (url.includes('setup')) {
      this.helpURL = 'setup';
    } else if(url.includes('data-overview-report')){
      this.helpURL = 'data-overview-report';
    } else if(url.includes('better-plants')){
      this.helpURL = 'better-plants';
    } else if(url.includes('analysis-report')){
      this.helpURL = 'analysis-report';
    } else if(url.includes('better-climate-report')){
      this.helpURL = 'better-climate-report';
    }
  }
}

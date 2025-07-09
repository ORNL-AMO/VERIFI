import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-facility-analysis-help',
    templateUrl: './facility-analysis-help.component.html',
    styleUrls: ['./facility-analysis-help.component.css'],
    standalone: false
})
export class FacilityAnalysisHelpComponent {

  routerSub: Subscription;
  helpURL: 'dashboard' | 'analysis-setup' | 'group-analysis' | 'account-analysis' | 'facility-analysis';
  constructor(private router: Router) { }

  ngOnInit(): void {
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
    if (url.includes('analysis-dashboard')) {
      this.helpURL = 'dashboard';
    } else if (url.includes('run-analysis')) {
      if (url.includes('analysis-setup')) {
        this.helpURL = 'analysis-setup';
      } else if (url.includes('group-analysis')) {
        this.helpURL = 'group-analysis';
      } else if (url.includes('facility-analysis')) {
        this.helpURL = 'facility-analysis';
      } else if (url.includes('account-analysis')) {
        this.helpURL = 'account-analysis';
      }
    }
  }
}

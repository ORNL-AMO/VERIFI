import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-analysis-help',
  templateUrl: './account-analysis-help.component.html',
  styleUrls: ['./account-analysis-help.component.css']
})
export class AccountAnalysisHelpComponent {

  helpURL: 'dashboard' | 'setup' | 'select-items' | 'results';
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
    } else if (url.includes('select-items')) {
      this.helpURL = 'select-items';
    } else if (url.includes('results')) {
      this.helpURL = 'results';
    }
  }
}

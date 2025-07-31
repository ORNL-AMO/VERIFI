import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-reports-help',
  standalone: false,
  templateUrl: './facility-reports-help.component.html',
  styleUrl: './facility-reports-help.component.css'
})
export class FacilityReportsHelpComponent {

  helpURL: 'dashboard' | 'setup' | 'overview-report' | 'analysis-report' | 'emission-factors-report';
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
    } else if(url.includes('overview-report')){
      this.helpURL = 'overview-report';
    } else if(url.includes('analysis-report')){
      this.helpURL = 'analysis-report';
    }  else if(url.includes('emission-factors-report')){
      this.helpURL = 'emission-factors-report';
    } 
  }
}

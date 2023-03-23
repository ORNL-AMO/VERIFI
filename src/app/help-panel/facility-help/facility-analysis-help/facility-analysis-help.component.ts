import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-analysis-help',
  templateUrl: './facility-analysis-help.component.html',
  styleUrls: ['./facility-analysis-help.component.css']
})
export class FacilityAnalysisHelpComponent {

  routerSub: Subscription;
  helpURL: 'dashboard';
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

  setHelpURL(url: string){
    if(url.includes('analysis-dashboard')){
      this.helpURL = 'dashboard';
    }
  }
}

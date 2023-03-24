import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-utility-help',
  templateUrl: './facility-utility-help.component.html',
  styleUrls: ['./facility-utility-help.component.css']
})
export class FacilityUtilityHelpComponent {

  helpURL: string;
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
    let componentOptions: Array<string> = [
      'monthly-meter-data',
      'energy-consumption',
      'meter-groups',
      'predictors',
    ]
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });
  }
}

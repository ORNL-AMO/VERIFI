import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';


@Component({
    selector: 'app-weather-data-help',
    templateUrl: './weather-data-help.component.html',
    styleUrls: ['./weather-data-help.component.css'],
    standalone: false
})
export class WeatherDataHelpComponent {

  helpURL: 'stations' | 'annual-station' | 'monthly-station' | 'daily-station';
  routerSub: Subscription;
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
    if (url.includes('stations')) {
      this.helpURL = 'stations';
    } else if (url.includes('annual-station')) {
      this.helpURL = 'annual-station';
    } else if (url.includes('monthly-station')) {
      this.helpURL = 'monthly-station';
    } else if (url.includes('daily-station')) {
      this.helpURL = 'daily-station';
    }
  }
}

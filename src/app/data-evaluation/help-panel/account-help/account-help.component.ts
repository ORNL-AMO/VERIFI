import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-account-help',
    templateUrl: './account-help.component.html',
    styleUrls: ['./account-help.component.css'],
    standalone: false
})
export class AccountHelpComponent implements OnInit {
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
      'home',
      'reports',
      'overview',
      'settings',
      'analysis',
      'custom-data'
    ]
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });
  }
}

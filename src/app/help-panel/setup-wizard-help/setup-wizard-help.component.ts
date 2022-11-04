import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-setup-wizard-help',
  templateUrl: './setup-wizard-help.component.html',
  styleUrls: ['./setup-wizard-help.component.css']
})
export class SetupWizardHelpComponent implements OnInit {

  helpURL: string;
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

  ngOnDestroy(){
    this.routerSub.unsubscribe();
  }

  setHelpURL(url: string){
    let componentOptions: Array<string> = [
      'welcome',
      'facility-setup',
      'account-setup',
      'confirmation'
    ];
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });
  }

}

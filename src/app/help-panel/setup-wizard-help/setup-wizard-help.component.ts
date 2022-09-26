import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-setup-wizard-help',
  templateUrl: './setup-wizard-help.component.html',
  styleUrls: ['./setup-wizard-help.component.css']
})
export class SetupWizardHelpComponent implements OnInit {

  helpURL: string;
  constructor(private router: Router) { }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setHelpURL(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setHelpURL(this.router.url);
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

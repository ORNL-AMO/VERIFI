import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-data-management-help-panel',
  standalone: false,
  templateUrl: './data-management-help-panel.component.html',
  styleUrl: './data-management-help-panel.component.css'
})
export class DataManagementHelpPanelComponent {

  helpURL: string;
  routerSub: Subscription;
  constructor(
    private router: Router
  ) {
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
    if (url.includes('home')) {
      this.helpURL = 'todo-list';
    } else if(url.includes('account-setup')) {
      this.helpURL = 'account-setup';
    } else if(url.includes('import-data')){
      this.helpURL = 'upload';
    }

    // let componentOptions: Array<string> = [
    //   'upload',
    //   'help',
    //   'facility',
    //   'account',
    //   'weather-data'
    // ]
    // let urlSplit: Array<string> = url.split('/');
    // let firstUrl: string = urlSplit[1];
    // this.helpURL = componentOptions.find(option => {
    //   return firstUrl == option;
    // });
  }
}

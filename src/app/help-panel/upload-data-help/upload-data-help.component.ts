import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-upload-data-help',
  templateUrl: './upload-data-help.component.html',
  styleUrls: ['./upload-data-help.component.css']
})
export class UploadDataHelpComponent implements OnInit {

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
      'confirm-predictors',
      'confirm-readings',
      'file-upload',
      'identify-columns',
      'manage-meters',
      'select-worksheet',
      'set-facility-meters',
      'set-facility-predictors',
      'submit',
      'template-facilities'
    ];
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });
  }

}

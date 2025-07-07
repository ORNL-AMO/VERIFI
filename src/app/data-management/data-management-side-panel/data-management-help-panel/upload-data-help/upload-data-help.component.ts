import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-upload-data-help',
    templateUrl: './upload-data-help.component.html',
    styleUrls: ['./upload-data-help.component.css'],
    standalone: false
})
export class UploadDataHelpComponent implements OnInit {

  helpURL: UploadHelpUrl;
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
    let componentOptions: Array<UploadHelpUrl> = [
      'confirm-predictors',
      'meter-readings',
      'upload-files',
      'identify-columns',
      'confirm-meters',
      'select-worksheet',
      'map-meters-to-facilities',
      'map-predictors-to-facilities',
      'submit',
      'template-facilities',
       'predictor-data'
    ];
    this.helpURL = componentOptions.find(option => {
      return url.includes(option);
    });
  }
}

type UploadHelpUrl = 'confirm-predictors' | 'meter-readings' | 'upload-files' | 'identify-columns' | 'confirm-meters' | 'select-worksheet' | 'map-meters-to-facilities' | 'map-predictors-to-facilities' | 'submit' | 'template-facilities' | 'predictor-data';

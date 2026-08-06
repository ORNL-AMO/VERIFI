import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-predictors-data-help',
  templateUrl: './predictors-data-help.component.html',
  styleUrls: ['./predictors-data-help.component.css'],
  standalone: false
})
export class PredictorsDataHelpComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  routerSub: Subscription;
  helpURL: 'manage' | 'entries' | 'predictor-form' | 'predictor-entry-form';
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
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
    this.selectedFacilitySub.unsubscribe();
  }

  setHelpURL(url: string) {

    if (url.includes('data-management')) {
      let urlParts: Array<string> = url.split('/');
      let endOfUrl: string = urlParts[urlParts.length - 1];
      if (endOfUrl === 'predictors') {
        this.helpURL = 'manage';
      } else if (endOfUrl == 'predictor-data') {
        this.helpURL = 'entries'
      } else {
        this.helpURL = 'predictor-form';
      }

    } else {
      if (url.includes('manage')) {
        if (url.includes('predictor-table')) {
          this.helpURL = 'manage';
        } else if (url.includes('add-predictor') || url.includes('edit-predictor')) {
          this.helpURL = 'predictor-form';
        }
      } else if (url.includes('entries')) {
        if (url.includes('predictor-entries-table')) {
          this.helpURL = 'entries';
        } else if (url.includes('add-entry') || url.includes('edit-entry')) {
          this.helpURL = 'predictor-entry-form';
        }
      }
    }
  }

}

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from '../data-evaluation.service';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css'],
  standalone: false
})
export class HelpPanelComponent implements OnInit {
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);

  helpPanelOpenSub: Subscription;
  helpPanelOpen: boolean;

  helpURL: string;
  routerSub: Subscription;

  constructor(
    private router: Router,
    private dataEvaluationService: DataEvaluationService
  ) {
  }

  ngOnInit() {
    this.helpPanelOpenSub = this.dataEvaluationService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
      //needed to resize charts
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
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
    this.helpPanelOpenSub.unsubscribe();
  }

  toggleCollapseHelpPanel() {
    this.emitToggleCollapse.emit(!this.helpPanelOpen);
  }

  setHelpURL(url: string) {
    let componentOptions: Array<string> = [
      'help',
      'facility',
      'account',
      'weather-data'
    ]
    let urlSplit: Array<string> = url.split('/');
    let firstUrl: string = urlSplit[2];
    this.helpURL = componentOptions.find(option => {
      return firstUrl == option;
    });
  }

}

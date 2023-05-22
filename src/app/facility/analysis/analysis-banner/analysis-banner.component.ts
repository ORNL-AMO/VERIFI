import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css']
})
export class AnalysisBannerComponent implements OnInit {

  inRunAnalysis: boolean;
  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  groups: Array<AnalysisGroup>;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  routerSub: Subscription;
  constructor(private helpPanelService: HelpPanelService, private router: Router,
    private analysisDbService: AnalysisDbService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(item => {
      this.analysisItem = item;
    })
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInRunAnalysis(event.url);
      }
    });
    this.setInRunAnalysis(this.router.url);
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  setInRunAnalysis(url: string) {
    this.inRunAnalysis = url.includes('run-analysis');
    if (this.analysisItem && this.inRunAnalysis) {
      this.groups = this.analysisItem.groups;
    } else {
      this.groups = new Array();
    }
  }

  goToDashboard() {
    this.router.navigateByUrl('/analysis/analysis-dashboard')
  }
}

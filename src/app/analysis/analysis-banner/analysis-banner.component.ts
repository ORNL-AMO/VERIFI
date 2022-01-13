import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css']
})
export class AnalysisBannerComponent implements OnInit {

  bannerTitle: string = 'Analysis';
  inRunAnalysis: boolean;
  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  constructor(private helpPanelService: HelpPanelService, private router: Router,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(item => {
      this.analysisItem = item;
    })
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInRunAnalysis(event.url);
      }
    });
    this.setInRunAnalysis(this.router.url);
  }
  
  ngOnDestroy(){
    this.analysisItemSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  setInRunAnalysis(url: string){
    this.inRunAnalysis = url.includes('run-analysis');
  }

  goToDashboard(){
    this.router.navigateByUrl('/analysis/analysis-dashboard')
  }
}

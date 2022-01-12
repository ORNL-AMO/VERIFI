import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css']
})
export class AnalysisBannerComponent implements OnInit {

  bannerTitle: string = 'Analysis';
  inRunAnalysis: boolean;
  constructor(private helpPanelService: HelpPanelService, private router: Router) { }

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInRunAnalysis(event.url);
      }
    });
    this.setInRunAnalysis(this.router.url);
  }
  
  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  setInRunAnalysis(url: string){
    this.inRunAnalysis = url.includes('run-analysis');
  }
}

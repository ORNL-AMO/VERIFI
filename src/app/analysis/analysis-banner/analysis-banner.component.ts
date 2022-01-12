import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css']
})
export class AnalysisBannerComponent implements OnInit {

  bannerTitle: string = 'Analysis';
  
  constructor(private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
  }


  
  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}

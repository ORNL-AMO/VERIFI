import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup, IdbAnalysisItem } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';

@Component({
  selector: 'app-group-analysis',
  templateUrl: './group-analysis.component.html',
  styleUrls: ['./group-analysis.component.css']
})
export class GroupAnalysisComponent implements OnInit {

  analysisItem: IdbAnalysisItem;
  selectedGroup: AnalysisGroup;
  groupId: number;
  label: string
  constructor(private activatedRoute: ActivatedRoute, private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService, private router: Router) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.activatedRoute.params.subscribe(params => {
      this.groupId = parseInt(params['id']);
      this.selectedGroup = this.analysisItem.groups.find(group => { return group.idbGroup.id == this.groupId });
      this.analysisService.selectedGroup.next(this.selectedGroup);
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(event.url);
      }
    });
    this.setLabel(this.router.url);
  }


  setLabel(url: string) {
    if (url.includes('options')) {
      this.label = this.selectedGroup.idbGroup.name + ' Setup'
    } else if (url.includes('annual-energy-intensity')) {
      this.label = this.selectedGroup.idbGroup.name + ' Annual Analysis'
    } else if (url.includes('monthly-energy-intensity')) {
      this.label = this.selectedGroup.idbGroup.name + ' Monthly Analysis'
    }
  }
}

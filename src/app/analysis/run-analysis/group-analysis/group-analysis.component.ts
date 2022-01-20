import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
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
    private analysisService: AnalysisService, private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.activatedRoute.params.subscribe(params => {
      this.groupId = parseInt(params['id']);
      this.selectedGroup = this.analysisItem.groups.find(group => { return group.idbGroupId == this.groupId });
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
    let groupName: string = this.utilityMeterGroupDbService.getGroupName(this.selectedGroup.idbGroupId)
    if (url.includes('options')) {
      this.label = groupName + ' Setup'
    } else if (url.includes('annual-energy-intensity')) {
      this.label = groupName + ' Annual Analysis'
    } else if (url.includes('monthly-energy-intensity')) {
      this.label = groupName + ' Monthly Analysis'
    }
  }
}

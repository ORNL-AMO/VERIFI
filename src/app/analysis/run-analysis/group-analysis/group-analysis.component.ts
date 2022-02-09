import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbUtilityMeter } from 'src/app/models/idb';
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
  groupHasError: boolean;
  analysisItemSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService, private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
      this.selectedGroup = this.analysisItem.groups.find(group => { return group.idbGroupId == this.groupId });
      this.setGroupError();
    })
    this.activatedRoute.params.subscribe(params => {
      this.groupId = parseInt(params['id']);
      this.selectedGroup = this.analysisItem.groups.find(group => { return group.idbGroupId == this.groupId });
      this.setGroupError();
      this.analysisService.selectedGroup.next(this.selectedGroup);
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });
    this.setLabel(this.router.url);
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
  }

  setLabel(url: string) {
    if (this.selectedGroup) {
      let groupName: string = this.utilityMeterGroupDbService.getGroupName(this.selectedGroup.idbGroupId);
      if (url.includes('annual-energy-intensity')) {
        this.label = groupName + ' Annual Analysis'
      } else if (url.includes('monthly-energy-intensity')) {
        this.label = groupName + ' Monthly Analysis'
      } else if (url.includes('monthly-regression-analysis')) {
        this.label = groupName + ' Monthly Regression Analysis'
      } else if (url.includes('annual-regression-analysis')) {
        this.label = groupName + ' Annual Regression Analysis'
      } else if (url.includes('annual-absolute-energy-consumption')) {
        this.label = groupName + ' Annual Absolute Analysis'
      } else if (url.includes('monthly-absolute-energy-consumption')) {
        this.label = groupName + ' Monthly Absolute Analysis'
      } else {
        this.label = groupName + ' Setup'
      }
    }
  }

  setGroupError() {
    if (this.selectedGroup) {
      let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(this.selectedGroup.idbGroupId);
      this.groupHasError = (groupMeters.length == 0);
      if (!this.groupHasError) {
        this.groupHasError = this.selectedGroup.groupHasError;
      }
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisGroup, GroupErrors, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';

@Component({
  selector: 'app-group-analysis',
  templateUrl: './group-analysis.component.html',
  styleUrls: ['./group-analysis.component.css']
})
export class GroupAnalysisComponent implements OnInit {

  analysisItem: IdbAnalysisItem;
  selectedGroup: AnalysisGroup;
  selectedGroupSub: Subscription;
  groupId: string;
  label: string
  analysisItemSub: Subscription;
  showModelSelection: boolean;
  routerSub: Subscription;
  setupErrors: boolean;
  regressionErrors: boolean;
  hasErrors: boolean;
  hasInvalidRegressionModel: boolean;
  constructor(private activatedRoute: ActivatedRoute, private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService, private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
    })
    this.activatedRoute.params.subscribe(params => {
      this.groupId = params['id'];
      this.setSelectedGroup();
    });
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });

    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
      if (this.selectedGroup) {
        this.showModelSelection = this.selectedGroup.analysisType == 'regression';
        this.setErrorBools();
      }
    });
    this.setLabel(this.router.url);
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedGroupSub.unsubscribe();
  }

  setSelectedGroup() {
    if (this.groupId != undefined) {
      let selectedGroup: AnalysisGroup = this.analysisItem.groups.find(group => { return group.idbGroupId == this.groupId });
      this.analysisService.selectedGroup.next(selectedGroup);
    }
  }

  setLabel(url: string) {
    if (this.selectedGroup) {
      let groupName: string = this.utilityMeterGroupDbService.getGroupName(this.selectedGroup.idbGroupId);
      if (url.includes('annual-analysis')) {
        this.label = groupName + ' Annual Analysis';
      } else if (url.includes('monthly-analysis')) {
        this.label = groupName + ' Monthly Analysis';
      } else if (url.includes('model-selection')) {
        this.label = groupName + ' Regression Model';
      } else {
        this.label = groupName + ' Setup'
      }
    }
  }

  setErrorBools() {
    this.hasErrors = this.selectedGroup.groupErrors.hasErrors;
    this.hasInvalidRegressionModel = this.selectedGroup.groupErrors.hasInvalidRegressionModel;
    if (this.selectedGroup.groupErrors.hasErrors) {
      this.regressionErrors = (this.selectedGroup.groupErrors.missingRegressionConstant ||
        this.selectedGroup.groupErrors.missingRegressionModelYear ||
        this.selectedGroup.groupErrors.missingRegressionModelSelection ||
        this.selectedGroup.groupErrors.missingRegressionPredictorCoef);
      this.setupErrors = (this.selectedGroup.groupErrors.invalidAverageBaseload || this.selectedGroup.groupErrors.noProductionVariables ||
        this.selectedGroup.groupErrors.invalidAverageBaseload || this.selectedGroup.groupErrors.invalidMonthlyBaseload || this.selectedGroup.groupErrors.missingGroupMeters)
    } else {
      this.regressionErrors = false;
      this.setupErrors = false;
    }
  }
}

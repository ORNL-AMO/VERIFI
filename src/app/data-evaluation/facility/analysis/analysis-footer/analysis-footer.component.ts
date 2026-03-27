import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from '../analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisService } from 'src/app/data-evaluation/account/account-analysis/account-analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisGroup, AnalysisSetupErrors, GroupErrors } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getAnalysisSetupErrors } from 'src/app/shared/validation/analysisValidation';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';

@Component({
  selector: 'app-analysis-footer',
  templateUrl: './analysis-footer.component.html',
  styleUrls: ['./analysis-footer.component.css'],
  standalone: false
})
export class AnalysisFooterComponent implements OnInit {

  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  selectedGroup: AnalysisGroup;
  selectedGroupSub: Subscription;

  routerSub: Subscription;
  showContinue: boolean;
  showGoBackToAccount: boolean;
  disableContinue: boolean = false;
  helpWidth: number;
  helpWidthSub: Subscription;

  sidebarWidth: number;
  sidebarWidthSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private dataEvaluationService: DataEvaluationService,
    private calanderizationService: CalanderizationService,
    private predictorDataDbService: PredictorDataDbService) { }

  ngOnInit(): void {
    this.showGoBackToAccount = this.analysisService.accountAnalysisItem != undefined;
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setShowContinue();
      }
    });
    this.setShowContinue();
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
      this.setDisableContinue();
    });

    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
      this.setDisableContinue();
    });
    this.helpWidthSub = this.dataEvaluationService.helpWidthBs.subscribe(helpWidth => {
      this.helpWidth = helpWidth;
    });
    this.sidebarWidthSub = this.dataEvaluationService.sidebarWidthBs.subscribe(sidebarWidth => {
      this.sidebarWidth = sidebarWidth;
    });
    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeterData.subscribe(meters => {
      this.calanderizedMeters = meters;
      this.setDisableContinue();
    });
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
    this.selectedGroupSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.helpWidthSub.unsubscribe();
    this.sidebarWidthSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  goBack() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
    if (this.router.url.includes('account-analysis')) {
      this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
    } else if (this.router.url.includes('facility-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
      } else {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[this.analysisItem.groups.length - 1].idbGroupId + '/monthly-analysis');
      }
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        if (this.selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/options');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/options');
      } else if (this.router.url.includes('options')) {
        let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
        if (groupIndex > 0) {
          if (this.analysisItem.groups[groupIndex - 1].analysisType == 'skip') {
            this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[groupIndex - 1].idbGroupId + '/options');
          } else {
            this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[groupIndex - 1].idbGroupId + '/monthly-analysis');
          }
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'analysis-setup');
        }
      }
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/analysis-dashboard');
    }
  }

  continue() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
    if (this.router.url.includes('analysis-setup')) {
      this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('options') && this.selectedGroup.analysisType != 'skip') {
        if (this.selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/monthly-analysis');
      } else {
        let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
        if (groupIndex < this.analysisItem.groups.length - 1) {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[groupIndex + 1].idbGroupId + '/options');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
        }
      }
    } else if (this.router.url.includes('facility-analysis')) {
      if (this.router.url.includes('annual-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
      } else {
        this.router.navigateByUrl(facilityUrlStr + 'account-analysis');
      }
    }
  }

  setShowContinue() {
    this.showContinue = (this.router.url.includes('account-analysis') == false);
  }

  goBackToAccount() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // this.accountAnalysisService.selectedFacility.next(selectedFacility);
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.analysisService.accountAnalysisItem.guid })
    this.accountAnalysisDbService.selectedAnalysisItem.next(selectedAnalysisItem);
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items')
  }

  setDisableContinue() {
    let setupErrors: AnalysisSetupErrors;
    if (this.analysisItem && this.calanderizedMeters) {
      let facility: IdbFacility = this.facilityDbService.getFacilityById(this.analysisItem.facilityId);
      let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facility.guid);
      setupErrors = getAnalysisSetupErrors(this.analysisItem, this.calanderizedMeters, facility, facilityPredictorData);
    }
    if (this.router.url.includes('analysis-setup')) {
      if (setupErrors && setupErrors.hasError) {
        this.disableContinue = true;
      } else {
        this.disableContinue = false;
      }
    } else if (this.router.url.includes('group-analysis') && this.selectedGroup && setupErrors) {
      let groupErrors: GroupErrors = setupErrors.groupErrors.find(groupError => { return groupError.groupId == this.selectedGroup.idbGroupId });
      if (this.router.url.includes('options')) {
        if (groupErrors.hasErrors) {
          if (groupErrors.invalidAverageBaseload || groupErrors.invalidMonthlyBaseload
            || (groupErrors.missingGroupMeters && this.selectedGroup.analysisType !== 'skip') || groupErrors.noProductionVariables || groupErrors.missingProductionVariables) {
            this.disableContinue = true;
          } else {
            this.disableContinue = false;
          }
        } else {
          this.disableContinue = false;
        }
      } else if (this.router.url.includes('model-selection') && setupErrors) {
        if (groupErrors.hasErrors) {
          if (groupErrors.missingRegressionConstant ||
            groupErrors.missingRegressionModelYear ||
            groupErrors.missingRegressionModelStartMonth ||
            groupErrors.missingRegressionStartYear ||
            groupErrors.missingRegressionModelEndMonth ||
            groupErrors.missingRegressionEndYear ||
            groupErrors.invalidModelDateSelection ||
            groupErrors.missingRegressionModelSelection ||
            groupErrors.missingRegressionPredictorCoef) {
            this.disableContinue = true;
          } else {
            this.disableContinue = false;
          }
        } else {
          this.disableContinue = false;
        }
      } else {
        this.disableContinue = false;
      }
    }
  }

  returnToDashboard() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/analysis-dashboard');
  }

}

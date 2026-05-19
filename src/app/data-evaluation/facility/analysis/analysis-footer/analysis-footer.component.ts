import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { filter, map, startWith, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from '../analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { AnalysisSetupErrors, GroupAnalysisErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
@Component({
  selector: 'app-analysis-footer',
  templateUrl: './analysis-footer.component.html',
  styleUrls: ['./analysis-footer.component.css'],
  standalone: false
})
export class AnalysisFooterComponent {
  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private dataEvaluationService: DataEvaluationService = inject(DataEvaluationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  helpWidth: Signal<number> = toSignal(this.dataEvaluationService.helpWidthBs);
  sidebarWidth: Signal<number> = toSignal(this.dataEvaluationService.sidebarWidthBs);
  accountAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.analysisService.accountAnalysisItem);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  analysisStatusCheck: Signal<AnalysisStatusCheck> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) {
      return undefined;
    }
    const analysisStatusCheck: AnalysisStatusCheck = facilityStatusCheck.analysisStatusChecks.find(asc => asc.analysisItem.guid === analysisItem.guid);
    return analysisStatusCheck
  });

  setupErrors: Signal<AnalysisSetupErrors> = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck ? analysisStatusCheck.analysisSetupErrors : undefined;
  });

  showContinue: Signal<boolean> = computed(() => {
    const currentUrl = this.url();
    return currentUrl.includes('account-analysis') == false;
  });

  disableContinue: Signal<boolean> = computed(() => {
    const setupErrors: AnalysisSetupErrors = this.setupErrors();
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const selectedGroup: AnalysisGroup = this.selectedGroup();
    const url: string = this.url();
    if (!analysisItem || !setupErrors) {
      return true;
    }
    if (url.includes('analysis-setup')) {
      if (setupErrors.setupHasError) {
        return true;
      } else {
        return false;
      }
    }
    if (url.includes('group-analysis')) {
      if (!selectedGroup) {
        return true;
      }
      if (selectedGroup.analysisType == 'skip' || selectedGroup.analysisType == 'skipAnalysis') {
        return false;
      }
      const groupErrors: GroupAnalysisErrors = setupErrors.groupErrors.find(groupError => { return groupError.groupId == selectedGroup.idbGroupId });
      if (groupErrors) {
        if (url.includes('options')) {
          if (groupErrors.hasErrors) {
            if (groupErrors.invalidAverageBaseload || groupErrors.invalidMonthlyBaseload
              || groupErrors.missingGroupMeters || groupErrors.noProductionVariables || groupErrors.missingProductionVariables) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else if (url.includes('model-selection')) {
          if (groupErrors.hasErrors) {
            if (groupErrors.hasRegressionErrors) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      return true;
    }
  });

  showGoBackToAccount: Signal<boolean> = computed(() => {
    const accountAnalysisItem = this.accountAnalysisItem();
    return accountAnalysisItem !== undefined;
  });

  goBack() {
    const facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    const selectedGroup: AnalysisGroup = this.selectedGroup();
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
    if (this.router.url.includes('account-analysis')) {
      this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
    } else if (this.router.url.includes('facility-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
      } else {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[analysisItem.groups.length - 1].idbGroupId + '/monthly-analysis');
      }
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        if (selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/options');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/options');
      } else if (this.router.url.includes('options')) {
        let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == selectedGroup.idbGroupId });
        if (groupIndex > 0) {
          if (analysisItem.groups[groupIndex - 1].analysisType == 'skip') {
            this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex - 1].idbGroupId + '/options');
          } else {
            this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex - 1].idbGroupId + '/monthly-analysis');
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
    const facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    const selectedGroup: AnalysisGroup = this.selectedGroup();
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const facilityUrlStr: string = '/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/';
    if (this.router.url.includes('analysis-setup')) {
      this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[0].idbGroupId + '/options');
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('options') && selectedGroup.analysisType != 'skip') {
        if (selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + selectedGroup.idbGroupId + '/monthly-analysis');
      } else {
        let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == selectedGroup.idbGroupId });
        if (groupIndex < analysisItem.groups.length - 1) {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + analysisItem.groups[groupIndex + 1].idbGroupId + '/options');
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

  goBackToAccount() {
    const accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    const accountAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisItem();
    const selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == accountAnalysisItem.guid })
    this.accountAnalysisDbService.selectedAnalysisItem.next(selectedAnalysisItem);
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items')
  }

  returnToDashboard() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/analysis-dashboard');
  }
}

import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { filter, map, startWith, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';

@Component({
  selector: 'app-account-analysis-footer',
  templateUrl: './account-analysis-footer.component.html',
  styleUrls: ['./account-analysis-footer.component.css'],
  standalone: false
})
export class AccountAnalysisFooterComponent {

  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private dataEvaluationService: DataEvaluationService = inject(DataEvaluationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  helpWidth: Signal<number> = toSignal(this.dataEvaluationService.helpWidthBs);
  sidebarWidth: Signal<number> = toSignal(this.dataEvaluationService.sidebarWidthBs);
  analysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard');
  });

  showContinue: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('/results/monthly-analysis') == false;
  });

  analysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const analysisItem = this.analysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if(analysisItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(analysisItem.guid);
    }
    return undefined;
  });

  canContinue: Signal<boolean> = computed(() => {
    const url = this.url();
    const analysisItem = this.analysisItem();
    const analysisStatusCheck = this.analysisStatusCheck();
    if(url && analysisItem && analysisStatusCheck) {
      if(url.includes('setup')) {
        return !analysisStatusCheck.accountAnalysisSetupErrors.hasSetupErrors;
      } else if (url.includes('select-items')) {
        return !analysisStatusCheck.accountAnalysisSetupErrors.facilitiesSelectionsInvalid;
      }
    }
    return true;
  });

  goBack() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
    } else if (this.router.url.includes('account/analysis/select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == 0) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
      } else {
        this.facilityDbService.selectedFacility.next(facilities[facilityIndex - 1]);
      }
    } else if (this.router.url.includes('results')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        this.facilityDbService.selectedFacility.next(facilities[facilities.length - 1]);
        this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
      }
    }
  }

  continue() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
    } else if (this.router.url.includes('select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == facilities.length - 1) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        this.facilityDbService.selectedFacility.next(facilities[facilityIndex + 1]);
      }
    } else if (this.router.url.includes('results')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results/monthly-analysis');
    }
  }

  returnToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
  }
}

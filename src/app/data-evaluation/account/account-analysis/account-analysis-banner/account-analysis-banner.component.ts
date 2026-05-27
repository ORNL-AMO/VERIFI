import { Component, computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-analysis-banner',
  templateUrl: './account-analysis-banner.component.html',
  styleUrls: ['./account-analysis-banner.component.css'],
  standalone: false
})
export class AccountAnalysisBannerComponent {
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen);
  accountAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = toSignal(this.accountAnalysisDbService.accountAnalysisItems);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard') || (url == '/data-evaluation/account/analysis');
  });
  
  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  analysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const accountAnalysisItem = this.accountAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if(accountAnalysisItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(accountAnalysisItem.guid);
    }
    return undefined;
  });

  showDropdown: boolean = false;

  constructor() {
    effect(() => {
      const url = this.url();
      this.showDropdown = false;
    })
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbAccountAnalysisItem) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }
}

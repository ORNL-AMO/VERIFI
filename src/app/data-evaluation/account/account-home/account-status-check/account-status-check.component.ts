import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

@Component({
  selector: 'app-account-status-check',
  standalone: false,
  templateUrl: './account-status-check.component.html',
  styleUrl: './account-status-check.component.css'
})
export class AccountStatusCheckComponent {
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private router: Router = inject(Router);

  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(
    this.accountStatusCheckService.accountStatusCheck,
    { initialValue: undefined }
  );

  orderedFacilityChecks: Signal<Array<FacilityStatusCheck>> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    if (!accountStatusCheck) return [];
    //order facilities error first, then warning, then good. Within each status order alphabetically by facility name
    return accountStatusCheck.facilityStatusChecks.sort((a, b) => {
      const statusOrder = { 'error': 0, 'warning': 1, 'good': 2 };
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];
      if (statusComparison !== 0) return statusComparison;
      return a.facility.name.localeCompare(b.facility.name);
    });
  });

  goToFacility(fc: FacilityStatusCheck) {
    this.router.navigateByUrl(`/data-evaluation/facility/${fc.facility.guid}/home`);
  }
}

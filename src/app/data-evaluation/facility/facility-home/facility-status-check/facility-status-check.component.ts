import { Component, computed, effect, inject, OnDestroy, OnInit, Signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityHomeService } from '../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-status-check',
  standalone: false,
  templateUrl: './facility-status-check.component.html',
  styleUrl: './facility-status-check.component.css',
})
export class FacilityStatusCheckComponent {

  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck, { initialValue: undefined });
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });

  facilityStatusCheck: Signal<FacilityStatusCheck> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    const selectedFacility = this.selectedFacility();
    if (!accountStatusCheck || !selectedFacility) return;
    return accountStatusCheck.facilityStatusChecks.find(fc => fc.facility.guid === selectedFacility.guid);
  });
}

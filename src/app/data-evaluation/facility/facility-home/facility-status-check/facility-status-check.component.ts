import { Component, inject, OnDestroy, OnInit, Signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityHomeService } from '../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

@Component({
  selector: 'app-facility-status-check',
  standalone: false,
  templateUrl: './facility-status-check.component.html',
  styleUrl: './facility-status-check.component.css',
})
export class FacilityStatusCheckComponent implements OnInit, OnDestroy {

  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.facilityHomeService.facilityStatusCheck, { initialValue: undefined });

  private statusCheckSub: Subscription;

  ngOnInit() {
    this.statusCheckSub = this.accountStatusCheckService.accountStatusCheck.subscribe(accountStatusCheck => {
      if (!accountStatusCheck) return;
      const selectedFacility = this.facilityDbService.selectedFacility.getValue();
      if (!selectedFacility) return;
      const facilityCheck = accountStatusCheck.facilityStatusChecks.find(fc => fc.facility.guid === selectedFacility.guid);
      if (facilityCheck) {
        this.facilityHomeService.facilityStatusCheck.next(facilityCheck);
      }
    });
  }

  ngOnDestroy() {
    this.statusCheckSub.unsubscribe();
  }
}

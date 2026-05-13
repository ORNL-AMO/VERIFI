import { Component, inject, Signal } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-status-check',
  standalone: false,
  templateUrl: './facility-status-check.component.html',
  styleUrl: './facility-status-check.component.css',
})
export class FacilityStatusCheckComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
}

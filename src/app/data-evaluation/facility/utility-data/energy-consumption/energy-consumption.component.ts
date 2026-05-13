import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

interface MetersListItem {
  meter: IdbUtilityMeter;
  meterStatusCheck: MeterStatusCheck;
}

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css'],
  standalone: false
})
export class EnergyConsumptionComponent {
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  utilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.facilityMeters, { initialValue: undefined });
  meterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$)

  metersList: Signal<Array<MetersListItem>> = computed(() => {
    const utilityMeters = this.utilityMeters();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!utilityMeters || !facilityStatusCheck) return [];
    return utilityMeters.map(meter => ({
      meter,
      meterStatusCheck: facilityStatusCheck.metersStatusChecks.find(mc => mc.meterId === meter.guid)
    }));
  });

}

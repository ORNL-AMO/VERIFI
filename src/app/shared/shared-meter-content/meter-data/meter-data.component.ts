import { Component, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-meter-data',
  templateUrl: './meter-data.component.html',
  styleUrl: './meter-data.component.css',
  standalone: false
})
export class MeterDataComponent {
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  private params: Signal<Params> = toSignal(this.activatedRoute.params);
  private facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.accountMeters);

  selectedMeter: Signal<IdbUtilityMeter> = toSignal(this.utilityMeterDbService.selectedMeter);
  constructor() {
    effect(() => {
      const params: Params = this.params();
      const meterId: string = params['id'];
      const facilityMeters: Array<IdbUtilityMeter> = this.facilityMeters();
      const selectedMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.guid == meterId });
      this.utilityMeterDbService.selectedMeter.next(selectedMeter);
    });
  }
}

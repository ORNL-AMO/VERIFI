import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, effect, inject, Signal, computed } from '@angular/core';
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
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  private params: Signal<Params> = toSignal(this.activatedRoute.params);
  private facilityMeters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.meters()]);

  selectedMeter: Signal<IdbUtilityMeter> = this.accountWorkspaceStore.selectedMeter;
  constructor() {
    effect(() => {
      const params: Params = this.params();
      const meterId: string = params['id'];
      const facilityMeters: Array<IdbUtilityMeter> = this.facilityMeters();
      const selectedMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.guid == meterId });
      this.accountWorkspaceService.selectMeter((selectedMeter)?.guid);
    });
  }
}

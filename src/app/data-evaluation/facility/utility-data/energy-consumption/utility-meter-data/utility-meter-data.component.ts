import { Component, computed, effect, inject, Signal } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css'],
  standalone: false
})
export class UtilityMeterDataComponent {

  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);

  private params: Signal<Params> = toSignal(this.activatedRoute.params);
  private facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.accountMeters);

  private routerUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)   // emit current URL immediately
    )
  );

  selectedMeter: Signal<IdbUtilityMeter> = toSignal(this.utilityMeterDbService.selectedMeter);
  label: Signal<string> = computed(() => {
    const url = this.routerUrl();
    if (url.includes('new-bill')) return 'New Bill';
    if (url.includes('edit-bill')) return 'Edit Bill';
    return 'Bills';
  });
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

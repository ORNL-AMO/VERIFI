import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-facility-meters-table',
  templateUrl: './facility-meters-table.component.html',
  styleUrl: './facility-meters-table.component.css',
  standalone: false
})
export class FacilityMetersTableComponent {
  private facilityDbService = inject(FacilitydbService);
  selectedFacility = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
}

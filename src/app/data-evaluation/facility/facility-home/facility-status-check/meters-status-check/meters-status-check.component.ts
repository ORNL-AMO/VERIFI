import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-meters-status-check',
    standalone: false,
    templateUrl: './meters-status-check.component.html',
    styleUrl: './meters-status-check.component.css'
})
export class MetersStatusCheckComponent {
    @Input({ required: true }) metersStatusChecks: Array<MeterStatusCheck>;
    @Input({ required: true }) metersStatus: 'good' | 'warning' | 'error';

    private router: Router = inject(Router);
    private facilityDbService: FacilitydbService = inject(FacilitydbService);

    goToMeter(meterId: string) {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        this.router.navigateByUrl(`/data-evaluation/facility/${selectedFacility.guid}/utility/energy-consumption/utility-meter/${meterId}/data-table`);
    }
}

import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { STATUS_CHECK_OPTIONS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-meters-status-check',
    standalone: false,
    templateUrl: './meters-status-check.component.html',
    styleUrl: './meters-status-check.component.css'
})
export class MetersStatusCheckComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
    @Input({ required: true }) metersStatusChecks: Array<MeterStatusCheck>;
    @Input({ required: true }) metersStatus: STATUS_CHECK_OPTIONS;
    @Input({ required: true }) hasNoMeters: boolean;
    @Input({ required: true }) hasNoMeterGroups: boolean;
    @Input({ required: true }) facilityMeterActionUrl: string;

    private router: Router = inject(Router);
    private facilityDbService: FacilitydbService = inject(FacilitydbService);

    goToMeter(meterId: string) {
        let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
        this.router.navigateByUrl(`/data-evaluation/facility/${selectedFacility.guid}/utility/energy-consumption/utility-meter/${meterId}/data-table`);
    }
}

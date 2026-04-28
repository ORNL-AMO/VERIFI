import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-predictors-status-check',
  standalone: false,
  templateUrl: './predictors-status-check.component.html',
  styleUrl: './predictors-status-check.component.css'
})
export class PredictorsStatusCheckComponent {
  @Input({ required: true }) predictorsStatusChecks: Array<PredictorStatusCheck>;
  @Input({ required: true }) predictorsStatus: 'good' | 'warning' | 'error';

  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);

  goToPredictor(predictorId: string) {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl(`/data-evaluation/facility/${facility.guid}/utility/predictors/predictor/${predictorId}/entries-table`);
  }
}

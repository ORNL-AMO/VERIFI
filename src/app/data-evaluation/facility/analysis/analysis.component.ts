import { Component, effect, inject, OnDestroy, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisService } from './analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css'],
  standalone: false
})
export class AnalysisComponent implements OnDestroy {
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);
  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private analysisDbService = inject(AnalysisDbService);

  utilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  utilityMeterGroups: Signal<Array<IdbUtilityMeterGroup>> = toSignal(this.utilityMeterGroupDbService.facilityMeterGroups);
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  annualKey: string;
  monthlyKey: string;

  constructor() {
    effect(() => {
      const selectedFacility = this.facility();
      if (selectedFacility) {
        this.annualKey = 'annual-' + selectedFacility.id;
        this.monthlyKey = 'monthly-' + selectedFacility.id;
      }
    })
  }

  ngOnDestroy() {
    //Reset when leaving analysis section
    this.analysisService.accountAnalysisItem = undefined;
    this.analysisService.hideInUseMessage = false;
    this.analysisService.getDisplaySubject(this.annualKey, 'table').next('table');
    this.analysisService.getDisplaySubject(this.monthlyKey, 'graph').next('graph');
    this.analysisDbService.clearGeneratedModels();
  }

  goToMeterGroups() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility/meter-groups')
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility')
  }
}

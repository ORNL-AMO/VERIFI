import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisService } from './analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css'],
  standalone: false
})
export class AnalysisComponent implements OnInit {

  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;
  facilitySub: Subscription;
  facility: IdbFacility;
  annualKey: string;
  monthlyKey: string;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });

    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(val => {
      this.utilityMeterGroups = val;
    });

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.annualKey = 'annual-' + this.facility?.id;
      this.monthlyKey = 'monthly-' + this.facility?.id;
    });
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.utilityMeterGroupsSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.analysisService.accountAnalysisItem = undefined;
    this.analysisService.hideInUseMessage = false;
    this.analysisService.getDisplaySubject(this.annualKey, 'table').next('table');
    this.analysisService.getDisplaySubject(this.monthlyKey, 'graph').next('graph');
  }

  goToMeterGroups() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/meter-groups')
  }

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility')
  }
}

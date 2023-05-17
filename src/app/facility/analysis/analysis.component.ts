import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { AnalysisService } from './analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {

  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;
  facilityAnalysisItemsSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisValidationService: AnalysisValidationService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });

    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(val => {
      this.utilityMeterGroups = val;
    });

    this.facilityAnalysisItemsSub = this.analysisDbService.accountAnalysisItems.subscribe(val => {
      this.updateAccountValidation(val);
    })
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.utilityMeterGroupsSub.unsubscribe();
    this.analysisService.accountAnalysisItem = undefined;
    this.facilityAnalysisItemsSub.unsubscribe();
  }

  goToMeterGroups() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility/meter-groups')
  }

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility')
  }

  async updateAccountValidation(allAnalysisItems: Array<IdbAnalysisItem>) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let hasChanges: boolean = false;
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      let item: IdbAccountAnalysisItem = accountAnalysisItems[i];
      let results: { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } = this.analysisValidationService.updateFacilitySelectionErrors(item, allAnalysisItems);
      if (results.isChanged) {
        accountAnalysisItems[i] = results.analysisItem;
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
    }
  }
}
